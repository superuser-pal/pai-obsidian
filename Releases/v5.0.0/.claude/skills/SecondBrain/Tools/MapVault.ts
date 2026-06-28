#!/usr/bin/env bun
/**
 * MapVault.ts — domain mapper (Phase 12 §3 / old-spec §1.3).
 *
 * Three responsibilities:
 *
 *   1. Rebuild each domain's INDEX.md "Active Work" table from
 *      01_PROJECTS/PROJECT_*.md frontmatter (planning + active only). The
 *      rebuild is bounded by `<!-- map-vault:begin -->` and
 *      `<!-- map-vault:end -->` markers, so hand-written sections elsewhere
 *      in INDEX.md stay untouched. If the markers are missing, MapVault
 *      reports it as a fix proposal — does not patch INDEX.md silently.
 *
 *   2. Propose naming fixes for files that violate fork conventions:
 *      - 01_PROJECTS/<name>.md not matching PROJECT_<UPPER_SNAKE>.md or
 *        AD_HOC_TASKS.md
 *      - 02_PAGES/<name>.md not kebab-case
 *      Each proposal includes the inbound wikilink references that would
 *      need to be rewritten in lockstep. Default: report only (--report).
 *      With --apply-renames, executes the git mv + inbound rewrites — but
 *      the workflow layer (Workflows/MapVault.md) confirms each rename
 *      first.
 *
 *   3. Detect true orphans — notes with zero outbound AND zero inbound
 *      wikilinks. The inbound check requires a vault-wide backlink index
 *      which is built once and reused across all checks. Links and filenames
 *      are matched through a normalized slug key, so `[[Display Name]]` credits
 *      `display-name.md` instead of producing a false orphan.
 *
 * Default: --report (no writes). --apply rebuilds Active Work tables.
 * --apply-renames performs the rename+rewrite batch (workflow-confirmed).
 *
 * Usage:
 *   bun MapVault.ts                                  # report-only
 *   bun MapVault.ts --domain Work                    # scope to one domain
 *   bun MapVault.ts --apply                          # rebuild INDEX tables
 *   bun MapVault.ts --apply-renames                  # execute rename batch
 *   bun MapVault.ts --apply-renames --only a.md,b    # only those renames (by basename)
 *   bun MapVault.ts --json                           # machine-readable
 *
 * `--only <names>` (comma-separated, repeatable) makes rename application
 * per-rename instead of all-or-nothing: the workflow can confirm one proposal,
 * pass its source basename, and apply just that one.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, relative, dirname } from "node:path";
import { $ } from "bun";
import { vaultPaths } from "./ResolveRoot.ts";

const PASCAL_RE = /^[A-Z][a-zA-Z0-9]*$/;
const PROJECT_RE = /^(PROJECT_[A-Z][A-Z0-9_]*|AD_HOC_TASKS)\.md$/;
const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const SPECIAL_DOMAINS = new Set(["Knowledge"]);
const MARKER_BEGIN = "<!-- map-vault:begin -->";
const MARKER_END = "<!-- map-vault:end -->";

type Frontmatter = Record<string, string>;

type ActiveWorkRow = {
  file: string;          // absolute path
  rel: string;           // relative to vault root
  basename: string;      // e.g. PROJECT_PHASE12
  fm: Frontmatter;
};

type RenameProposal = {
  from: string;          // absolute path
  to: string;            // absolute path
  fromBasename: string;  // e.g. CamelCasePage
  toBasename: string;    // e.g. camel-case-page
  reason: string;        // V2a / V2b
  inboundRefs: { file: string; line: number; rawLink: string }[];
};

type OrphanReport = {
  file: string;
  outbound: number;
  inbound: number;
};

type DomainMap = {
  name: string;
  special: boolean;
  indexExists: boolean;
  indexHasMarkers: boolean;
  activeWork: ActiveWorkRow[];
  renames: RenameProposal[];
  orphans: OrphanReport[];
  indexChange: { before: string; after: string } | null;
};

function parseFrontmatter(content: string): Frontmatter {
  const lines = content.split("\n");
  if (lines[0] !== "---") return {};
  let end = -1;
  for (let i = 1; i < lines.length; i++) if (lines[i] === "---") { end = i; break; }
  if (end === -1) return {};
  const fm: Frontmatter = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    fm[m[1]!] = (m[2] ?? "").replace(/^["']|["']$/g, "").trim();
  }
  return fm;
}

function bodyOf(content: string): string {
  const lines = content.split("\n");
  if (lines[0] !== "---") return content;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(i + 1).join("\n");
  }
  return content;
}

function walkMd(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMd(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

/** Extract wikilinks from a content body (frontmatter stripped). */
function wikilinksInBody(body: string): string[] {
  const matches = body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  return [...matches].map((m) => (m[1] ?? "").trim()).filter(Boolean);
}

/** Build a backlink index: normalized target slug → list of files linking to it.
 *  Keyed via normalizeLinkKey so `[[Display Name]]` and `display-name.md` collide
 *  on the same key (orphan lookup normalizes the file's stem the same way). */
function buildBacklinkIndex(allFiles: string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const file of allFiles) {
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch { continue; }
    const body = bodyOf(content);
    const links = wikilinksInBody(body);
    for (const link of links) {
      // Obsidian resolves [[Some Page]] → Some Page.md; [[domains/X/Y]] → that path.
      // Index by the normalized basename so humanized links match slug filenames.
      const stem = link.split("|")[0]!.trim();
      const key = normalizeLinkKey(basename(stem));
      if (!key) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push(file);
    }
  }
  return index;
}

/** Canonical comparison key for a note name or wikilink target. Folds the
 *  cosmetic differences Obsidian tolerates between a display link and a slug
 *  filename — `[[Display Name]]`, `[[Display_Name]]`, and `display-name.md` all
 *  reduce to `display-name`. Used for backlink/orphan matching so a humanized
 *  link still credits its kebab-case file (was the L8 false-orphan bug). */
function normalizeLinkKey(stem: string): string {
  return stem
    .replace(/\.md$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // CamelCase → Camel-Case
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** Kebab-case a filename (canonical key + `.md`). */
function toKebab(name: string): string {
  return normalizeLinkKey(name) + ".md";
}

/** Find inbound `[[<oldStem>]]` references and propose rewrites to `[[<newStem>]]`. */
function findInboundRefs(
  allFiles: string[],
  oldStem: string,
): { file: string; line: number; rawLink: string }[] {
  const out: { file: string; line: number; rawLink: string }[] = [];
  const escaped = oldStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\[\\[\\s*${escaped}(\\s*\\|[^\\]]*)?\\s*\\]\\]`, "g");
  for (const file of allFiles) {
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch { continue; }
    const lines = content.split("\n");
    lines.forEach((lineText, idx) => {
      const matches = lineText.matchAll(re);
      for (const m of matches) {
        out.push({ file, line: idx + 1, rawLink: m[0] });
      }
    });
  }
  return out;
}

/** Render the Active Work table as a markdown block. */
function renderActiveWorkTable(rows: ActiveWorkRow[]): string {
  if (rows.length === 0) {
    return `${MARKER_BEGIN}\n\n_No active work in this domain._\n\n${MARKER_END}`;
  }
  // Sort by last_updated desc, then by name.
  const sorted = [...rows].sort((a, b) => {
    const al = a.fm.last_updated ?? a.fm.created ?? "";
    const bl = b.fm.last_updated ?? b.fm.created ?? "";
    return bl.localeCompare(al) || a.basename.localeCompare(b.basename);
  });
  const lines: string[] = [
    MARKER_BEGIN,
    "",
    "| Project | Status | Priority | Last updated |",
    "|---|---|---|---|",
  ];
  for (const row of sorted) {
    const link = `[[${row.basename}]]`;
    const status = row.fm.status ?? "?";
    const priority = row.fm.priority ?? "?";
    const updated = row.fm.last_updated ?? row.fm.created ?? "?";
    lines.push(`| ${link} | ${status} | ${priority} | ${updated} |`);
  }
  lines.push("", MARKER_END);
  return lines.join("\n");
}

/** Splice a new Active Work block between the markers in INDEX content. */
function replaceActiveWorkBlock(indexContent: string, newBlock: string): {
  changed: boolean;
  content: string;
  hasMarkers: boolean;
} {
  const beginIdx = indexContent.indexOf(MARKER_BEGIN);
  const endIdx = indexContent.indexOf(MARKER_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return { changed: false, content: indexContent, hasMarkers: false };
  }
  const before = indexContent.slice(0, beginIdx);
  const after = indexContent.slice(endIdx + MARKER_END.length);
  const next = before + newBlock + after;
  return { changed: next !== indexContent, content: next, hasMarkers: true };
}

function isSpecialDomain(name: string): boolean {
  return SPECIAL_DOMAINS.has(name);
}

async function mapDomain(
  domainPath: string,
  allVaultFiles: string[],
  backlinks: Map<string, string[]>,
  opts: { applyIndex: boolean },
): Promise<DomainMap> {
  const name = basename(domainPath);
  const special = isSpecialDomain(name);
  const indexPath = join(domainPath, "INDEX.md");
  const indexExists = existsSync(indexPath);
  let indexHasMarkers = false;
  let indexChange: { before: string; after: string } | null = null;

  // (1) Active Work table — projects in this domain with status planning|active
  const activeWork: ActiveWorkRow[] = [];
  if (!special) {
    const projectsDir = join(domainPath, "01_PROJECTS");
    if (existsSync(projectsDir)) {
      for (const entry of readdirSync(projectsDir)) {
        if (!entry.endsWith(".md")) continue;
        if (!PROJECT_RE.test(entry)) continue; // misnamed files handled by (2)
        if (entry === "AD_HOC_TASKS.md") continue;
        const file = join(projectsDir, entry);
        let content: string;
        try { content = readFileSync(file, "utf-8"); } catch { continue; }
        const fm = parseFrontmatter(content);
        const status = (fm.status ?? "").toLowerCase();
        if (status !== "planning" && status !== "active") continue;
        activeWork.push({
          file,
          rel: relative(dirname(domainPath), file),
          basename: entry.replace(/\.md$/, ""),
          fm,
        });
      }
    }
  }

  if (indexExists && !special) {
    const indexContent = readFileSync(indexPath, "utf-8");
    const newBlock = renderActiveWorkTable(activeWork);
    const result = replaceActiveWorkBlock(indexContent, newBlock);
    indexHasMarkers = result.hasMarkers;
    if (result.hasMarkers && result.changed) {
      indexChange = { before: indexContent, after: result.content };
      if (opts.applyIndex) writeFileSync(indexPath, result.content, "utf-8");
    }
  }

  // (2) Rename proposals
  const renames: RenameProposal[] = [];
  if (!special) {
    const projectsDir = join(domainPath, "01_PROJECTS");
    if (existsSync(projectsDir)) {
      for (const entry of readdirSync(projectsDir)) {
        if (!entry.endsWith(".md") || entry === "INDEX.md") continue;
        if (PROJECT_RE.test(entry)) continue;
        const from = join(projectsDir, entry);
        const stem = entry.replace(/\.md$/, "");
        const upper = stem.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase().replace(/^_|_$/g, "");
        const toBase = upper.startsWith("PROJECT_") ? `${upper}.md` : `PROJECT_${upper}.md`;
        const to = join(projectsDir, toBase);
        renames.push({
          from, to,
          fromBasename: stem,
          toBasename: toBase.replace(/\.md$/, ""),
          reason: "V2a",
          inboundRefs: findInboundRefs(allVaultFiles, stem),
        });
      }
    }
    const pagesDir = join(domainPath, "02_PAGES");
    if (existsSync(pagesDir)) {
      for (const entry of readdirSync(pagesDir)) {
        if (!entry.endsWith(".md")) continue;
        if (KEBAB_RE.test(entry)) continue;
        const from = join(pagesDir, entry);
        const toBase = toKebab(entry);
        const to = join(pagesDir, toBase);
        renames.push({
          from, to,
          fromBasename: entry.replace(/\.md$/, ""),
          toBasename: toBase.replace(/\.md$/, ""),
          reason: "V2b",
          inboundRefs: findInboundRefs(allVaultFiles, entry.replace(/\.md$/, "")),
        });
      }
    }
  }

  // (3) Orphans (zero inbound + zero outbound). Skip INDEX/AD_HOC_TASKS and
  // PROJECT_*.md — navigation/aggregator/task-list pages that legitimately
  // carry no wikilinks (and PROJECT_*.md only gains an inbound link once the
  // Active Work rebuild runs, so flagging it here is a false positive).
  const orphans: OrphanReport[] = [];
  const allMd = walkMd(domainPath);
  for (const file of allMd) {
    const base = basename(file);
    if (base === "INDEX.md" || base === "AD_HOC_TASKS.md" || PROJECT_RE.test(base)) continue;
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch { continue; }
    const body = bodyOf(content);
    const outbound = wikilinksInBody(body).length;
    const key = normalizeLinkKey(base);
    const inbound = (backlinks.get(key) ?? []).filter((f) => f !== file).length;
    if (outbound === 0 && inbound === 0) {
      orphans.push({ file, outbound, inbound });
    }
  }

  return {
    name,
    special,
    indexExists,
    indexHasMarkers,
    activeWork,
    renames,
    orphans,
    indexChange,
  };
}

async function applyRenameBatch(renames: RenameProposal[], vaultRoot: string): Promise<{
  applied: { from: string; to: string; rewrites: number }[];
  errors: string[];
}> {
  const applied: { from: string; to: string; rewrites: number }[] = [];
  const errors: string[] = [];
  for (const r of renames) {
    // git mv inside the vault root.
    const fromRel = relative(vaultRoot, r.from);
    const toRel = relative(vaultRoot, r.to);
    const result = await $`git -C ${vaultRoot} mv ${fromRel} ${toRel}`.quiet().nothrow();
    if (result.exitCode !== 0) {
      // Fallback to fs rename if not under git or git mv fails.
      try {
        const { renameSync } = await import("node:fs");
        renameSync(r.from, r.to);
      } catch (e) {
        errors.push(`${fromRel} → ${toRel}: ${(e as Error).message}`);
        continue;
      }
    }
    // Rewrite inbound wikilinks in lockstep.
    let rewrites = 0;
    for (const ref of r.inboundRefs) {
      let content: string;
      try { content = readFileSync(ref.file, "utf-8"); } catch { continue; }
      const escaped = r.fromBasename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(\\[\\[\\s*)${escaped}(\\s*(?:\\|[^\\]]*)?\\s*\\]\\])`, "g");
      const next = content.replace(re, (_m, p1, p2) => `${p1}${r.toBasename}${p2}`);
      if (next !== content) {
        writeFileSync(ref.file, next, "utf-8");
        rewrites += 1;
      }
    }
    applied.push({ from: fromRel, to: toRel, rewrites });
  }
  return { applied, errors };
}

export async function mapVault(opts: {
  domain?: string;
  applyIndex?: boolean;
  applyRenames?: boolean;
  /** When set, only renames whose source basename is in this list are applied
   *  (true per-rename confirmation; `--only`). Match is on basename, with or
   *  without the `.md` suffix. */
  only?: string[];
} = {}): Promise<{
  vault: string;
  domains: DomainMap[];
  applied?: { from: string; to: string; rewrites: number }[];
  errors?: string[];
}> {
  const paths = await vaultPaths();
  const domainsRoot = paths.domains;
  if (!existsSync(domainsRoot)) return { vault: paths.root, domains: [] };

  const allDomainDirs = readdirSync(domainsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => join(domainsRoot, e.name));
  const targets = opts.domain
    ? allDomainDirs.filter((p) => basename(p) === opts.domain)
    : allDomainDirs;

  // Whole-vault file index for backlink lookup. Excludes the runtime PAI dir.
  const allVaultFiles: string[] = [];
  for (const d of allDomainDirs) allVaultFiles.push(...walkMd(d));
  for (const sub of ["inbox", "plan", "thinking", "dashboards", "bases"]) {
    const p = join(paths.root, sub);
    if (existsSync(p)) allVaultFiles.push(...walkMd(p));
  }
  const backlinks = buildBacklinkIndex(allVaultFiles);

  const domains: DomainMap[] = [];
  for (const p of targets) {
    domains.push(await mapDomain(p, allVaultFiles, backlinks, { applyIndex: opts.applyIndex ?? false }));
  }

  let applied: { from: string; to: string; rewrites: number }[] | undefined;
  let errors: string[] | undefined;
  if (opts.applyRenames) {
    let allRenames = domains.flatMap((d) => d.renames);
    if (opts.only && opts.only.length > 0) {
      const wanted = new Set(opts.only.map((s) => s.replace(/\.md$/, "")));
      allRenames = allRenames.filter((r) => wanted.has(basename(r.from).replace(/\.md$/, "")));
    }
    const result = await applyRenameBatch(allRenames, paths.root);
    applied = result.applied;
    errors = result.errors;
  }

  return { vault: paths.root, domains, applied, errors };
}

function formatHuman(result: Awaited<ReturnType<typeof mapVault>>): string {
  const lines: string[] = [];
  lines.push(`Vault: ${result.vault}`);
  lines.push("");
  for (const d of result.domains) {
    const tag = d.special ? " (special)" : "";
    lines.push(`# domains/${d.name}${tag}`);
    if (d.special) { lines.push("  ✓ skipped (special domain)"); lines.push(""); continue; }
    if (!d.indexExists) { lines.push("  ⚠ INDEX.md missing — run /create-domain to regenerate"); }
    else if (!d.indexHasMarkers) { lines.push("  ⚠ INDEX.md has no map-vault markers — re-create via /create-domain or add markers manually"); }
    else if (d.indexChange) { lines.push(`  ✏ Active Work table updated (${d.activeWork.length} project(s))`); }
    else { lines.push(`  ✓ Active Work table already current (${d.activeWork.length} project(s))`); }

    if (d.renames.length > 0) {
      lines.push(`  Renames proposed: ${d.renames.length}`);
      for (const r of d.renames) {
        const ref = r.inboundRefs.length;
        lines.push(`    [${r.reason}] ${basename(r.from)} → ${basename(r.to)}  (${ref} inbound ref${ref === 1 ? "" : "s"})`);
      }
    }
    if (d.orphans.length > 0) {
      lines.push(`  Orphans (no inbound + no outbound): ${d.orphans.length}`);
      for (const o of d.orphans) {
        lines.push(`    ${relative(result.vault, o.file)}`);
      }
    }
    lines.push("");
  }
  if (result.applied !== undefined) {
    lines.push(`Renames applied: ${result.applied.length}`);
    for (const a of result.applied) {
      lines.push(`  ${a.from} → ${a.to}  (${a.rewrites} inbound rewrite${a.rewrites === 1 ? "" : "s"})`);
    }
    if (result.errors && result.errors.length > 0) {
      lines.push(`Errors: ${result.errors.length}`);
      for (const e of result.errors) lines.push(`  ${e}`);
    }
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const applyIndex = args.includes("--apply");
  const applyRenames = args.includes("--apply-renames");
  const domainIdx = args.indexOf("--domain");
  const domain = domainIdx >= 0 ? args[domainIdx + 1] : undefined;
  // `--only A.md,B` (repeatable) → apply just those renames by source basename.
  const only: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--only" && args[i + 1]) {
      only.push(...args[i + 1]!.split(",").map((s) => s.trim()).filter(Boolean));
      i++;
    }
  }

  const result = await mapVault({ domain, applyIndex, applyRenames, only: only.length > 0 ? only : undefined });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatHuman(result));
  }
  process.exit(0);
}
