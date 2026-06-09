#!/usr/bin/env bun
/**
 * LintFrontmatter.ts — advisory frontmatter linter for SecondBrain markdown.
 *
 * Usage:
 *   bun LintFrontmatter.ts <file.md> [--json]
 *   bun LintFrontmatter.ts <dir/>   [--json]   # lints every .md under dir
 *
 * Per SECOND_BRAIN_MIGRATION_v2.md §13 R2 (preserving v1 invariant i2),
 * frontmatter lint is advisory: warnings go to stderr, exit code is ALWAYS 0.
 * The Pack 2 workflows (`/process`, `/distribute`, `/save`) call this for the
 * developer experience — they never gate on it.
 *
 * Checks performed:
 *   F1  File has YAML frontmatter (--- delimited block at top)
 *   F2  frontmatter.type is present (used by KnowledgeRipple classifier, §12)
 *   F3  inbox/{raw,ready}/ files: source + discovered present
 *   F4  Date-shaped fields (created, modified, discovered) parse as ISO 8601
 *   F5  tags is a YAML list, not a string
 *   F6  Basic wikilink hygiene: balanced [[ ]] in body
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, resolve, extname } from "node:path";

type Severity = "warn" | "info";
type Finding = { code: string; severity: Severity; message: string; file: string; line?: number };

function parseFrontmatter(content: string): { fm: Record<string, unknown>; body: string; raw: string | null; startLine: number } {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { fm: {}, body: content, raw: null, startLine: 0 };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) return { fm: {}, body: content, raw: null, startLine: 0 };

  const raw = lines.slice(1, end).join("\n");
  const body = lines.slice(end + 1).join("\n");

  // Minimal YAML parser — handles `key: value`, `key: [a, b]`, and `key:\n  - a\n  - b`.
  // Sufficient for the frontmatter shapes the v2 plan describes (§12). Anything
  // more exotic is left as a string and falls through to other checks.
  const fm: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;
  for (const line of raw.split("\n")) {
    if (currentList && /^\s+- /.test(line)) {
      currentList.push(line.replace(/^\s+- /, "").trim());
      continue;
    }
    if (currentKey && currentList) {
      fm[currentKey] = currentList;
      currentKey = null;
      currentList = null;
    }
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (rawVal === "") {
      currentKey = key;
      currentList = [];
      continue;
    }
    const inline = rawVal.match(/^\[(.*)\]$/);
    if (inline) {
      fm[key] = inline[1].split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      fm[key] = rawVal.replace(/^["']|["']$/g, "");
    }
  }
  if (currentKey && currentList) fm[currentKey] = currentList;

  return { fm, body, raw, startLine: end + 1 };
}

function isValidTimestamp(s: unknown): boolean {
  if (typeof s !== "string") return false;
  // Two accepted shapes:
  //  1. SecondBrain's mandated local format `%Y-%m-%d %I:%M %p` — e.g.
  //     "2026-05-20 08:23 PM" (12-hour, AM/PM). This is what `/process`,
  //     `/save`, and `/distribute` write; the frontmatter contract forbids ISO Z
  //     for these human-facing fields, so F4 must accept it (was the source bug:
  //     the linter warned on every compliant note).
  //  2. ISO 8601 dates and date-times — e.g. "2026-05-19" or "2026-05-19T14:32:11Z"
  //     (still valid for machine-written fields like ripple stubs / jsonl events).
  const local = /^\d{4}-\d{2}-\d{2} (0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;
  const iso = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
  return local.test(s) || iso.test(s);
}

/** Is this file SecondBrain vault content (vs a SKILL.md, README, doc, etc.)? */
function isVaultContent(file: string): boolean {
  // Entity notes live in domains/Knowledge/ — already covered by the `domains` match.
  return /\/(inbox|plan|thinking|domains|bases)(\/|$)/.test(file);
}

function lintFile(file: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(file, "utf-8");
  const { fm, body, raw } = parseFrontmatter(content);
  const vault = isVaultContent(file);

  // F1 — applies to vault content only. Generic markdown (READMEs, SKILL.md, docs)
  // legitimately has no frontmatter.
  if (raw === null) {
    if (vault) findings.push({ code: "F1", severity: "warn", message: "vault note missing YAML frontmatter (--- block at top)", file });
    return findings;
  }

  // F2 — `type:` is SecondBrain-specific (KnowledgeRipple classifier per §12).
  // Only applies to vault content.
  if (vault && !fm.type) {
    findings.push({ code: "F2", severity: "warn", message: "frontmatter.type missing (KnowledgeRipple classifier needs it)", file });
  }

  // F3 — inbox-specific
  const inInbox = /\/inbox\/(raw|ready)\//.test(file);
  if (inInbox) {
    if (!fm.source) findings.push({ code: "F3a", severity: "info", message: "inbox note missing `source:` (where the content came from)", file });
    if (!fm.discovered) findings.push({ code: "F3b", severity: "info", message: "inbox note missing `discovered:` timestamp", file });
  }

  // F4 — date sanity. Accepts SecondBrain's local `%Y-%m-%d %I:%M %p` format
  // (e.g. "2026-05-20 08:23 PM") and ISO 8601. See isValidTimestamp.
  for (const k of ["created", "modified", "discovered"] as const) {
    if (fm[k] !== undefined && !isValidTimestamp(fm[k])) {
      findings.push({ code: "F4", severity: "warn", message: `frontmatter.${k} is not a valid timestamp — expected local "YYYY-MM-DD HH:MM AM/PM" or ISO 8601 (got: ${JSON.stringify(fm[k])})`, file });
    }
  }

  // F5 — tags shape
  if (fm.tags !== undefined && !Array.isArray(fm.tags)) {
    findings.push({ code: "F5", severity: "warn", message: `frontmatter.tags should be a YAML list, got ${typeof fm.tags} (${JSON.stringify(fm.tags)})`, file });
  }

  // F6 — wikilink balance in body
  const opens = (body.match(/\[\[/g) || []).length;
  const closes = (body.match(/\]\]/g) || []).length;
  if (opens !== closes) {
    findings.push({ code: "F6", severity: "warn", message: `unbalanced wikilinks: ${opens} \`[[\` vs ${closes} \`]]\``, file });
  }

  return findings;
}

function walkMd(p: string): string[] {
  const st = statSync(p);
  if (st.isFile()) return extname(p) === ".md" ? [p] : [];
  const out: string[] = [];
  for (const entry of readdirSync(p, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(p, entry.name);
    if (entry.isDirectory()) out.push(...walkMd(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const targets = args.filter((a) => !a.startsWith("--"));

  if (targets.length === 0) {
    console.error("usage: bun LintFrontmatter.ts <file.md|dir> [--json]");
    process.exit(0); // advisory: even usage error is exit 0
  }

  const files: string[] = [];
  for (const t of targets) {
    try { files.push(...walkMd(resolve(t))); }
    catch (e) { console.error(`cannot read ${t}: ${(e as Error).message}`); }
  }

  const allFindings: Finding[] = [];
  for (const f of files) allFindings.push(...lintFile(f));

  if (jsonMode) {
    console.log(JSON.stringify({ files: files.length, findings: allFindings }, null, 2));
  } else {
    if (allFindings.length === 0) {
      console.error(`✓ ${files.length} file(s) clean`);
    } else {
      for (const f of allFindings) {
        const tag = f.severity === "warn" ? "WARN" : "info";
        console.error(`  [${tag}] ${f.code} ${f.file}: ${f.message}`);
      }
      console.error(`\n${allFindings.length} advisory finding(s) across ${files.length} file(s) — exit 0 (advisory)`);
    }
  }

  process.exit(0); // always advisory
}

main();
