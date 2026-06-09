#!/usr/bin/env bun
/**
 * KnowledgeRipple.ts — extract [[Entity]] wikilinks from a note and upsert a
 * typed entity note for each one directly into the VAULT.
 *
 * Phase 11 (vault as single source of truth): this tool used to write .md stubs
 * into `$PAI_DIR/PAI/MEMORY/KNOWLEDGE/_harvest-queue/` for PAI's harvester to
 * consume — but the harvester only ever read `.json`, so those stubs were never
 * picked up (a dead handoff). It now writes the entity note straight into the
 * vault at `$VAULT_DIR/domains/Knowledge/<slug>.md` with `type:` frontmatter,
 * where it is immediately visible in Obsidian and queryable via
 * `bases/Knowledge.base`. No queue, no separate typed graph.
 *
 * Classification (heuristic, refinable):
 *
 *   - `[[Alice Smith]]` (PascalCase, 2+ tokens) → person
 *   - `[[AcmeCorp]]` / `[[Acme Corp Inc]]` / contains Corp|Inc|Co.|LLC|Ltd → company
 *   - `[[idea: ...]]` prefix or note's frontmatter.type === "idea" → idea
 *   - `[[paper: ...]]` prefix / note's frontmatter.type === "research" → research
 *   - Otherwise: idea with `pending-classification: true` (user can fix later)
 *
 * Dedup: if a note with the same slug already exists ANYWHERE under the vault's
 * domains/ (not just the default landing folder), the entity is skipped — moving
 * an entity note out of domains/Knowledge/ does not cause it to be re-created.
 *
 * The entity note shape (canonical schema — see bases/Knowledge.base):
 *
 *   ---
 *   type: company
 *   created: 2026-06-09 02:14 PM
 *   source: secondbrain
 *   seen_in: domains/Work/02_PAGES/2026-05-19-test-note.md
 *   pending-classification: false
 *   tags: []
 *   related: []
 *   quality: 5
 *   ---
 *   # Acme Corp
 *
 * Usage:
 *   bun KnowledgeRipple.ts <note.md>           # upsert entity notes, exit 0
 *   bun KnowledgeRipple.ts <note.md> --dry-run # print what would be written
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { relative } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";
import { logEvent } from "./IngestLog.ts";

type EntityType = "person" | "company" | "idea" | "research";

const COMPANY_TOKENS = ["Corp", "Inc", "Co.", "LLC", "Ltd", "GmbH", "S.A.", "B.V."];
const PEOPLE_RE = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/;
const ENTITY_TYPES: EntityType[] = ["person", "company", "idea", "research"];

/** Local timestamp `YYYY-MM-DD HH:MM AM/PM` — the fork's frontmatter contract. */
function localTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

function parseFrontmatter(content: string): { fm: Record<string, unknown>; body: string } {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { fm: {}, body: content };
  let end = -1;
  for (let i = 1; i < lines.length; i++) if (lines[i] === "---") { end = i; break; }
  if (end === -1) return { fm: {}, body: content };
  const fm: Record<string, unknown> = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    fm[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  return { fm, body: lines.slice(end + 1).join("\n") };
}

function extractWikilinks(body: string): string[] {
  const matches = body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  const names = new Set<string>();
  for (const m of matches) names.add(m[1]!.trim());
  return [...names];
}

function classify(entity: string, noteFm: Record<string, unknown>): { type: EntityType; pending: boolean } {
  const lower = entity.toLowerCase();

  if (lower.startsWith("idea:")) return { type: "idea", pending: false };
  if (lower.startsWith("paper:")) return { type: "research", pending: false };
  if (lower.startsWith("research:")) return { type: "research", pending: false };

  if (COMPANY_TOKENS.some((t) => entity.includes(t))) return { type: "company", pending: false };
  if (PEOPLE_RE.test(entity)) return { type: "person", pending: false };

  // Single-word PascalCase or CamelCase with cap-acronym → likely company
  if (/^[A-Z]{2,}/.test(entity) || /^[A-Z][a-z]+[A-Z]/.test(entity)) {
    return { type: "company", pending: false };
  }

  // Inherit from the source note's frontmatter type if it's an entity type
  const noteType = String(noteFm.type ?? "").trim().toLowerCase();
  if (ENTITY_TYPES.includes(noteType as EntityType)) {
    return { type: noteType as EntityType, pending: false };
  }

  return { type: "idea", pending: true };
}

function slugify(entity: string): string {
  return entity
    .replace(/^(idea|paper|research):\s*/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** True if a `<slug>.md` note already exists anywhere under the vault's domains/. */
function noteExistsInVault(domainsDir: string, slug: string): boolean {
  const target = `${slug}.md`.toLowerCase();
  const walk = (dir: string): boolean => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        if (walk(`${dir}/${entry.name}`)) return true;
        continue;
      }
      if (entry.name.toLowerCase() === target) return true;
    }
    return false;
  };
  return walk(domainsDir);
}

export async function ripple(notePath: string, opts: { dryRun?: boolean } = {}): Promise<{ written: string[]; skipped: string[] }> {
  const content = readFileSync(notePath, "utf-8");
  const { fm, body } = parseFrontmatter(content);
  const wikilinks = extractWikilinks(body);
  const paths = await vaultPaths();
  const knowledgeDir = paths.knowledgeHome;

  if (!opts.dryRun && !existsSync(knowledgeDir)) mkdirSync(knowledgeDir, { recursive: true });

  const written: string[] = [];
  const skipped: string[] = [];
  const seenIn = relative(paths.root, notePath);

  for (const entity of wikilinks) {
    const { type, pending } = classify(entity, fm);
    const slug = slugify(entity);
    if (!slug) continue;
    const notePathOut = `${knowledgeDir}/${slug}.md`;

    // Dedup against the whole vault, not just the landing folder.
    if (noteExistsInVault(paths.domains, slug)) {
      skipped.push(notePathOut);
      continue;
    }

    const title = entity.replace(/^(idea|paper|research):\s*/i, "");
    const note = [
      "---",
      `type: ${type}`,
      `created: ${localTimestamp()}`,
      "source: secondbrain",
      `seen_in: ${seenIn}`,
      `pending-classification: ${pending}`,
      "tags: []",
      "related: []",
      "quality: 5",
      "---",
      `# ${title}`,
      "",
    ].join("\n");

    if (opts.dryRun) {
      console.log(`---- DRY-RUN ${notePathOut} ----`);
      console.log(note);
    } else {
      writeFileSync(notePathOut, note, "utf-8");
      await logEvent({ action: "ripple", source_note: seenIn, entity, type });
    }
    written.push(notePathOut);
  }

  return { written, skipped };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const notePath = args.find((a) => !a.startsWith("--"));
  if (!notePath) {
    console.error("usage: bun KnowledgeRipple.ts <note.md> [--dry-run]");
    process.exit(1);
  }
  const { written, skipped } = await ripple(notePath, { dryRun });
  console.log(JSON.stringify({ written, skipped }, null, 2));
}
