#!/usr/bin/env bun
/**
 * LintFrontmatter.ts — frontmatter linter for SecondBrain markdown.
 *
 * Usage:
 *   bun LintFrontmatter.ts <file.md> [--json] [--enforce]
 *   bun LintFrontmatter.ts <dir/>   [--json] [--enforce]   # lints every .md under dir
 *
 * Default mode: advisory (per plan §13 R2 / invariant i2). Warnings go to
 * stderr, exit code is ALWAYS 0. Hand-edits in Obsidian and post-hoc audits
 * stay friction-free.
 *
 * `--enforce` mode: every `warn` severity finding causes a non-zero exit.
 * SecondBrain workflows that CREATE or MOVE a file invoke the linter in
 * --enforce after the write, so the pipeline can't ship a file with a bad
 * `status:` or missing required field. `info` findings (e.g. F3 missing
 * `source:` on an inbox note) still don't block.
 *
 * Checks performed:
 *   F1  File has YAML frontmatter (--- delimited block at top)
 *   F2  frontmatter.type is present — required outside inbox/raw/
 *       (raw/ is intentionally partial; /process fills `type` in)
 *   F3  inbox/{raw,ready}/ files: source + discovered present (info)
 *   F4  Date-shaped fields (created, modified, discovered, last_updated, date)
 *       parse as local "YYYY-MM-DD HH:MM AM/PM" or ISO 8601
 *   F5  tags is a YAML list, not a string
 *   F6  Basic wikilink hygiene: balanced [[ ]] in body
 *   F7  frontmatter.status is present and a member of the lifecycle enum
 *       (unprocessed | thinking | ready | processed | archived)
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, resolve, extname } from "node:path";

export type Severity = "warn" | "info";
export type Finding = { code: string; severity: Severity; message: string; file: string; line?: number };

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
    const key = m[1]!;
    const rawVal = m[2]!;
    if (rawVal === "") {
      currentKey = key;
      currentList = [];
      continue;
    }
    const inline = rawVal.match(/^\[(.*)\]$/);
    if (inline) {
      fm[key] = inline[1]!.split(",").map((s) => s.trim()).filter(Boolean);
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
  return /\/(inbox|plan|thinking|domains|bases|dashboards)(\/|$)/.test(file);
}

/**
 * Is this file owned by ProjectManagement (which has its own `status:` enum:
 * `planning | active | completed | archived`)? F2 (type:) and F7 (SecondBrain
 * status enum) don't apply — ProjectManagement governs these files.
 *
 *  - `domains/<X>/01_PROJECTS/PROJECT_*.md`
 *  - `domains/<X>/01_PROJECTS/AD_HOC_TASKS.md`
 *  - `domains/<X>/03_ARCHIVE/PROJECT_*.md` (archived projects)
 *  - `dashboards/TASKS.md` (bidirectional task aggregator)
 */
function isProjectManagementFile(file: string): boolean {
  return (
    /\/01_PROJECTS\/(PROJECT_[A-Z][A-Z0-9_]*|AD_HOC_TASKS)\.md$/.test(file) ||
    /\/03_ARCHIVE\/PROJECT_[A-Z][A-Z0-9_]*\.md$/.test(file) ||
    /\/dashboards\/TASKS\.md$/.test(file)
  );
}

/**
 * Is this a `dashboards/` MOC/hub note (anything but TASKS.md)? These are
 * navigation entry points, not lifecycle content, so a missing `status:` is
 * expected (no F7a). If they *do* carry a status it's still enum-checked (F7b).
 * TASKS.md is handled separately as a ProjectManagement file.
 */
function isDashboardMoc(file: string): boolean {
  return /\/dashboards\//.test(file) && !/\/dashboards\/TASKS\.md$/.test(file);
}

/** Lifecycle enum for F7. Mirrors SECOND_BRAIN_PORT_PLAN §1 + old-spec 02-INBOX §2.1.0. */
const STATUS_VALUES = new Set(["unprocessed", "thinking", "ready", "processed", "archived"]);

export function lintFile(file: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(file, "utf-8");
  const { fm, body, raw } = parseFrontmatter(content);
  const vault = isVaultContent(file);
  const inRaw = /\/inbox\/raw\//.test(file);
  const isPmFile = isProjectManagementFile(file);

  // F1 — applies to vault content only. Generic markdown (READMEs, SKILL.md, docs)
  // legitimately has no frontmatter. ProjectManagement aggregator files
  // (AD_HOC_TASKS.md, dashboards/TASKS.md) also legitimately ship without
  // frontmatter — they're heading + Tasks-checkbox lists, not knowledge notes.
  if (raw === null) {
    if (vault && !isPmFile) findings.push({ code: "F1", severity: "warn", message: "vault note missing YAML frontmatter (--- block at top)", file });
    return findings;
  }

  // F2 — `type:` is SecondBrain-specific (KnowledgeRipple classifier per §12).
  // Vault content outside inbox/raw/ must carry it. Exemptions:
  //   - inbox/raw/: capture writes partial frontmatter; /process fills type in.
  //   - ProjectManagement files: use their own metadata schema (no SecondBrain type).
  if (vault && !inRaw && !isPmFile && !fm.type) {
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
  // `last_updated` and `date` are the fields the DailyRituals / ProjectManagement
  // layers lean on most, so they're validated alongside the SecondBrain trio.
  for (const k of ["created", "modified", "discovered", "last_updated", "date"] as const) {
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

  // F7 — status enum. Vault content must carry a `status:` from the SecondBrain
  // lifecycle enum. Workflows that create/move files run this in --enforce mode
  // so the pipeline can't produce a bad-state note. Hand-edits only see the
  // warning. ProjectManagement files are exempt — they use their own status
  // enum (`planning | active | completed | archived`).
  if (vault && !isPmFile) {
    const status = fm.status;
    if (status === undefined) {
      // dashboards/ MOC notes legitimately carry no lifecycle status — skip F7a.
      if (!isDashboardMoc(file)) {
        findings.push({ code: "F7a", severity: "warn", message: "frontmatter.status missing — expected one of: unprocessed | thinking | ready | processed | archived", file });
      }
    } else if (typeof status !== "string" || !STATUS_VALUES.has(status)) {
      findings.push({ code: "F7b", severity: "warn", message: `frontmatter.status is not a member of the lifecycle enum (got: ${JSON.stringify(status)}; expected: unprocessed|thinking|ready|processed|archived)`, file });
    }
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
  const enforce = args.includes("--enforce");
  const targets = args.filter((a) => !a.startsWith("--"));

  if (targets.length === 0) {
    console.error("usage: bun LintFrontmatter.ts <file.md|dir> [--json] [--enforce]");
    process.exit(0); // advisory: even usage error is exit 0
  }

  const files: string[] = [];
  for (const t of targets) {
    try { files.push(...walkMd(resolve(t))); }
    catch (e) { console.error(`cannot read ${t}: ${(e as Error).message}`); }
  }

  const allFindings: Finding[] = [];
  for (const f of files) allFindings.push(...lintFile(f));

  const warnCount = allFindings.filter((f) => f.severity === "warn").length;
  const willBlock = enforce && warnCount > 0;

  if (jsonMode) {
    console.log(JSON.stringify({ files: files.length, findings: allFindings, enforce, blocked: willBlock }, null, 2));
  } else {
    if (allFindings.length === 0) {
      console.error(`✓ ${files.length} file(s) clean${enforce ? " (--enforce)" : ""}`);
    } else {
      for (const f of allFindings) {
        const tag = f.severity === "warn" ? "WARN" : "info";
        console.error(`  [${tag}] ${f.code} ${f.file}: ${f.message}`);
      }
      const mode = enforce ? "enforce" : "advisory";
      const verdict = willBlock
        ? `${warnCount} warn finding(s) — exit 1 (--enforce)`
        : `${allFindings.length} finding(s) across ${files.length} file(s) — exit 0 (${mode})`;
      console.error(`\n${verdict}`);
    }
  }

  process.exit(willBlock ? 1 : 0);
}

// Only run the CLI when executed directly — importers (e.g. ValidateVault) get
// `lintFile` without triggering arg parsing or process.exit.
if (import.meta.main) main();
