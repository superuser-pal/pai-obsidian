#!/usr/bin/env bun
/**
 * ValidateVault.ts — domain hygiene audit (Phase 12 §2 / old-spec §1.2).
 *
 * Walks every "regular" domain under $VAULT_DIR/domains/ and checks:
 *
 *   V1  Skeleton present: INDEX.md, 01_PROJECTS/, 02_PAGES/, 03_ARCHIVE/.
 *   V2a 01_PROJECTS/ filenames: PROJECT_<UPPER_SNAKE>.md or AD_HOC_TASKS.md
 *       (matches ProjectManagement's ProjectCreate template).
 *   V2b 02_PAGES/ filenames: kebab-case (lowercase + digits, hyphen-separated).
 *       Date-prefixed slugs like 2026-05-19-team-sync.md pass.
 *   V2c Domain folder name: PascalCase (fork convention — supersedes old spec's
 *       kebab; plan §122).
 *   V3  Outbound orphan: every .md file has ≥1 `[[wikilink]]` in body. Exempt:
 *       INDEX.md / AD_HOC_TASKS.md / PROJECT_*.md (navigation + task-list pages
 *       that legitimately carry no body links), and ALL files in special
 *       domains (entity notes link via frontmatter, which the check strips).
 *       Inbound orphans are Phase 3's job (map-vault has to walk the whole vault
 *       anyway to rebuild the Active Work table).
 *   V4  Depth ≤ 3 below domain root. domains/<X>/02_PAGES/file.md is depth 2;
 *       a 4-level deep file (domains/<X>/02_PAGES/sub/sub2/file.md, depth 4)
 *       gets flagged.
 *
 * Plus all LintFrontmatter findings (F1–F7) surfaced per file.
 *
 * Special-cased:
 *   - domains/Knowledge/ — entity-notes folder; no skeleton, no naming rules.
 *     KnowledgeRipple manages it. Walked for frontmatter only.
 *   - ProjectManagement files (PROJECT_*.md, AD_HOC_TASKS.md, dashboards/TASKS.md)
 *     — LintFrontmatter already exempts them from F1/F2/F7.
 *
 * Default mode: ADVISORY — emits a report, always exits 0. Matches the fork's
 * invariant i2 stance. Use `--strict` to exit non-zero on any `warn` finding
 * (for CI / pre-commit).
 *
 * Usage:
 *   bun ValidateVault.ts                      # audit every domain
 *   bun ValidateVault.ts --domain Work        # scope to one domain
 *   bun ValidateVault.ts --json               # machine-readable
 *   bun ValidateVault.ts --strict             # exit non-zero on findings
 *
 * No auto-fix — that's Phase 3 (`map-vault`).
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";
import { lintFile } from "../../Qmd/Tools/LintFrontmatter.ts";

type Severity = "warn" | "info";
type Finding = { code: string; severity: Severity; message: string; file: string };

const PASCAL_RE = /^[A-Z][a-zA-Z0-9]*$/;
const PROJECT_RE = /^(PROJECT_[A-Z][A-Z0-9_]*|AD_HOC_TASKS)\.md$/;
const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const SKELETON = ["INDEX.md", "01_PROJECTS", "02_PAGES", "03_ARCHIVE"];

/** Domains that don't follow the regular skeleton — managed by other tools. */
const SPECIAL_DOMAINS = new Set(["Knowledge"]);

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

function extractWikilinks(content: string): string[] {
  // Strip frontmatter so wikilinks in YAML (e.g. `related: [[Foo]]`) don't
  // count — the orphan check is about BODY content.
  const lines = content.split("\n");
  let body = content;
  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        body = lines.slice(i + 1).join("\n");
        break;
      }
    }
  }
  const matches = body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  return [...new Set([...matches].map((m) => (m[1] ?? "").trim()))].filter(Boolean);
}

/** Depth of `file` below `domainRoot`. domain/02_PAGES/x.md = 2. */
function depthBelow(domainRoot: string, file: string): number {
  const rel = relative(domainRoot, file);
  return rel.split("/").length;
}

type DomainReport = {
  name: string;
  path: string;
  special: boolean;
  findings: Finding[];
  fileCount: number;
};

async function validateDomain(domainPath: string): Promise<DomainReport> {
  const name = basename(domainPath);
  const findings: Finding[] = [];
  const special = SPECIAL_DOMAINS.has(name);

  // V2c — domain folder name PascalCase
  if (!PASCAL_RE.test(name)) {
    findings.push({
      code: "V2c",
      severity: "warn",
      message: `domain folder name "${name}" is not PascalCase (fork convention)`,
      file: domainPath,
    });
  }

  // V1 — skeleton (skip for special domains)
  if (!special) {
    for (const item of SKELETON) {
      const p = join(domainPath, item);
      if (!existsSync(p)) {
        findings.push({
          code: "V1",
          severity: "warn",
          message: `domain skeleton missing: ${item}`,
          file: p,
        });
      }
    }
  }

  // V2a / V2b — per-file naming
  if (!special) {
    const projectsDir = join(domainPath, "01_PROJECTS");
    if (existsSync(projectsDir)) {
      for (const entry of readdirSync(projectsDir)) {
        if (!entry.endsWith(".md") || entry === "INDEX.md") continue;
        if (!PROJECT_RE.test(entry)) {
          findings.push({
            code: "V2a",
            severity: "warn",
            message: `01_PROJECTS/${entry} doesn't match PROJECT_<UPPER_SNAKE>.md or AD_HOC_TASKS.md`,
            file: join(projectsDir, entry),
          });
        }
      }
    }
    const pagesDir = join(domainPath, "02_PAGES");
    if (existsSync(pagesDir)) {
      for (const entry of readdirSync(pagesDir)) {
        if (!entry.endsWith(".md")) continue;
        if (!KEBAB_RE.test(entry)) {
          findings.push({
            code: "V2b",
            severity: "warn",
            message: `02_PAGES/${entry} is not kebab-case`,
            file: join(pagesDir, entry),
          });
        }
      }
    }
  }

  // V3 — outbound orphans + V4 — depth + LintFrontmatter delegation per .md
  const allMd = walkMd(domainPath);
  for (const file of allMd) {
    // V3 is skipped entirely for special domains (Knowledge): ripple-created
    // entity notes carry their links in frontmatter (`related:`/`seen_in:`),
    // which the orphan check strips, so every entity note is a false positive.
    // Also exempt navigation/aggregator pages whose role is to list other notes
    // via different syntaxes: INDEX.md, AD_HOC_TASKS.md, and PROJECT_*.md task
    // lists (which legitimately carry no body wikilinks).
    const base = basename(file);
    const v3Exempt = special || base === "INDEX.md" || base === "AD_HOC_TASKS.md" || PROJECT_RE.test(base);
    if (!v3Exempt) {
      try {
        const content = readFileSync(file, "utf-8");
        const links = extractWikilinks(content);
        if (links.length === 0) {
          findings.push({
            code: "V3",
            severity: "warn",
            message: `note has no [[wikilinks]] in body (outbound orphan)`,
            file,
          });
        }
      } catch (e) {
        findings.push({
          code: "V3",
          severity: "info",
          message: `could not read for orphan check: ${(e as Error).message}`,
          file,
        });
      }
    }

    // V4 — depth
    const depth = depthBelow(domainPath, file);
    if (depth > 3) {
      findings.push({
        code: "V4",
        severity: "warn",
        message: `file is ${depth} levels below domain root (max 3)`,
        file,
      });
    }

    // Delegate frontmatter checks to LintFrontmatter (imported directly — no
    // per-file subprocess). lintFile is advisory and never exits the process.
    findings.push(...lintFile(file));
  }

  // L6 — collapse double-reports for misnamed project files. A file flagged by
  // V2a (bad project name) loses LintFrontmatter's path-based PM exemption, so it
  // *also* draws F1/F2/F7a/F7b — confusing noise for one root cause. Suppress the
  // PM-exemptible frontmatter findings on any file that already has a V2a finding;
  // fixing the name restores the real exemption and clears them for good.
  const v2aFiles = new Set(findings.filter((f) => f.code === "V2a").map((f) => f.file));
  const pmExemptCodes = new Set(["F1", "F2", "F7a", "F7b"]);
  const deduped = v2aFiles.size === 0
    ? findings
    : findings.filter((f) => !(v2aFiles.has(f.file) && pmExemptCodes.has(f.code)));

  return { name, path: domainPath, special, findings: deduped, fileCount: allMd.length };
}

export async function validateVault(opts: { domain?: string } = {}): Promise<{
  vault: string;
  domains: DomainReport[];
}> {
  const paths = await vaultPaths();
  const domainsRoot = paths.domains;
  if (!existsSync(domainsRoot)) {
    return { vault: paths.root, domains: [] };
  }
  const all = readdirSync(domainsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => join(domainsRoot, e.name));
  const targets = opts.domain
    ? all.filter((p) => basename(p) === opts.domain)
    : all;
  const reports: DomainReport[] = [];
  for (const p of targets) {
    reports.push(await validateDomain(p));
  }
  return { vault: paths.root, domains: reports };
}

function formatHuman(result: { vault: string; domains: DomainReport[] }): string {
  const lines: string[] = [];
  lines.push(`Vault: ${result.vault}`);
  lines.push("");
  let totalWarn = 0, totalInfo = 0, totalFiles = 0;
  for (const d of result.domains) {
    const warns = d.findings.filter((f) => f.severity === "warn").length;
    const infos = d.findings.filter((f) => f.severity === "info").length;
    totalWarn += warns; totalInfo += infos; totalFiles += d.fileCount;
    const tag = d.special ? " (special)" : "";
    lines.push(`# domains/${d.name}${tag} — ${d.fileCount} file(s), ${warns} warn, ${infos} info`);
    if (d.findings.length === 0) {
      lines.push("  ✓ clean");
    } else {
      for (const f of d.findings) {
        const sev = f.severity === "warn" ? "WARN" : "info";
        const rel = relative(result.vault, f.file);
        lines.push(`  [${sev}] ${f.code} ${rel}: ${f.message}`);
      }
    }
    lines.push("");
  }
  lines.push(`Total: ${result.domains.length} domain(s), ${totalFiles} file(s), ${totalWarn} warn, ${totalInfo} info`);
  return lines.join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const strict = args.includes("--strict");
  const domainIdx = args.indexOf("--domain");
  const domain = domainIdx >= 0 ? args[domainIdx + 1] : undefined;

  const result = await validateVault({ domain });
  const allFindings = result.domains.flatMap((d) => d.findings);
  const warnCount = allFindings.filter((f) => f.severity === "warn").length;

  if (jsonMode) {
    console.log(JSON.stringify({ ...result, totals: { warn: warnCount, info: allFindings.length - warnCount }, strict, blocked: strict && warnCount > 0 }, null, 2));
  } else {
    console.log(formatHuman(result));
    if (strict && warnCount > 0) {
      console.error(`\n${warnCount} warn finding(s) — exit 1 (--strict)`);
    }
  }

  process.exit(strict && warnCount > 0 ? 1 : 0);
}
