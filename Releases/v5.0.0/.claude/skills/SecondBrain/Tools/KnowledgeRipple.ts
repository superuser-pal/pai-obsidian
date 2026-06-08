#!/usr/bin/env bun
/**
 * KnowledgeRipple.ts — extract [[Entity]] wikilinks from a note and emit stubs
 * into `.claude/PAI/MEMORY/KNOWLEDGE/_harvest-queue/<slug>.md` for PAI's existing
 * KnowledgeHarvester pipeline to consume.
 *
 * Per SECOND_BRAIN_MIGRATION_v2.md §12 + invariant i8: this tool NEVER writes to
 * KNOWLEDGE/{People,Companies,Ideas,Research}/ directly. Those typed paths are
 * owned by PAI's KnowledgeHarvester.ts — we only seed the queue.
 *
 * Classification (heuristic, refinable):
 *
 *   - `[[Alice Smith]]` (PascalCase, 2+ tokens) → People
 *   - `[[AcmeCorp]]` / `[[Acme Corp Inc]]` / contains Corp|Inc|Co.|LLC|Ltd → Companies
 *   - `[[idea: ...]]` prefix or note's frontmatter.type === "Ideas" → Ideas
 *   - `[[paper: ...]]` prefix / arxiv-URL nearby / note's frontmatter.type === "Research" → Research
 *   - Otherwise: Ideas with `pending-classification: true` (user can fix later)
 *
 * The stub file shape:
 *
 *   ---
 *   type: People
 *   source: secondbrain
 *   seen_in: domains/Work/02_PAGES/2026-05-19-test-note.md
 *   discovered: 2026-05-19T14:32:11Z
 *   pending-classification: false
 *   ---
 *   # Alice Example
 *
 * Usage:
 *   bun KnowledgeRipple.ts <note.md>           # emit stubs, exit 0
 *   bun KnowledgeRipple.ts <note.md> --dry-run # print what would be written
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";
import { logEvent } from "./IngestLog.ts";

type EntityType = "People" | "Companies" | "Ideas" | "Research";

const COMPANY_TOKENS = ["Corp", "Inc", "Co.", "LLC", "Ltd", "GmbH", "S.A.", "B.V."];
const PEOPLE_RE = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/;

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

  if (lower.startsWith("idea:")) return { type: "Ideas", pending: false };
  if (lower.startsWith("paper:")) return { type: "Research", pending: false };
  if (lower.startsWith("research:")) return { type: "Research", pending: false };

  if (COMPANY_TOKENS.some((t) => entity.includes(t))) return { type: "Companies", pending: false };
  if (PEOPLE_RE.test(entity)) return { type: "People", pending: false };

  // Single-word PascalCase or CamelCase with cap-acronym → likely Company
  if (/^[A-Z]{2,}/.test(entity) || /^[A-Z][a-z]+[A-Z]/.test(entity)) {
    return { type: "Companies", pending: false };
  }

  // Inherit from note's frontmatter type if it's an entity type
  const noteType = String(noteFm.type ?? "").trim();
  if (["People", "Companies", "Ideas", "Research"].includes(noteType)) {
    return { type: noteType as EntityType, pending: false };
  }

  return { type: "Ideas", pending: true };
}

function slugify(entity: string): string {
  return entity
    .replace(/^(idea|paper|research):\s*/i, "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ripple(notePath: string, opts: { dryRun?: boolean } = {}): Promise<{ written: string[]; skipped: string[] }> {
  const content = readFileSync(notePath, "utf-8");
  const { fm, body } = parseFrontmatter(content);
  const wikilinks = extractWikilinks(body);
  const paths = await vaultPaths();
  const queueDir = paths.memoryHarvestQueue;

  if (!opts.dryRun && !existsSync(queueDir)) mkdirSync(queueDir, { recursive: true });

  const written: string[] = [];
  const skipped: string[] = [];
  const seenIn = relative(paths.root, notePath);

  for (const entity of wikilinks) {
    const { type, pending } = classify(entity, fm);
    const slug = slugify(entity);
    const stubPath = `${queueDir}/${slug}.md`;

    if (existsSync(stubPath)) {
      skipped.push(stubPath);
      continue;
    }

    const stub = [
      "---",
      `type: ${type}`,
      "source: secondbrain",
      `seen_in: ${seenIn}`,
      `discovered: ${new Date().toISOString()}`,
      `pending-classification: ${pending}`,
      "---",
      `# ${entity.replace(/^(idea|paper|research):\s*/i, "")}`,
      "",
    ].join("\n");

    if (opts.dryRun) {
      console.log(`---- DRY-RUN ${stubPath} ----`);
      console.log(stub);
    } else {
      writeFileSync(stubPath, stub, "utf-8");
      await logEvent({ action: "ripple", source_note: seenIn, entity, type });
    }
    written.push(stubPath);
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
