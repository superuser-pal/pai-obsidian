#!/usr/bin/env bun
/**
 * ListThinking.ts — passive reminder for `$VAULT_DIR/thinking/` notes
 * (Phase 12 §6 / old-spec §2.2.0b).
 *
 * Walks `thinking/` recursively (subfolders hold Council/RedTeam outputs),
 * scopes to in-flight notes (`status: thinking` or no status), reads each
 * note's `last_updated` (fall back to `created`, fall back to file mtime),
 * sorts ascending (oldest first), and emits a list with a `⚠ stale` marker on
 * items older than the threshold (default 14 days; tunable with `--stale-days <N>`).
 *
 * This is the "non-interactive reminder block" the plan calls for. The
 * workflow prints the list AFTER processing, never prompts on it — the
 * operator promotes (move to `inbox/raw/`, drop `status: thinking`,
 * re-run `/process`) or archives at their own pace.
 *
 * Usage:
 *   bun ListThinking.ts                       # human report
 *   bun ListThinking.ts --json                # machine-readable
 *   bun ListThinking.ts --stale-days 30       # custom threshold
 */

import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";

const DEFAULT_STALE_DAYS = 14;

type ThinkingNote = {
  file: string;
  rel: string;
  title: string;
  last_updated: string;        // local format, or ISO, or mtime ISO
  age_days: number;
  stale: boolean;
};

/** Recursively collect `.md` files under `dir` (skips dotfiles/dotdirs).
 *  thinking/ holds Council/RedTeam outputs in subfolders per the vault
 *  conventions, so a flat scan would miss them. */
function walkMd(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMd(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function parseFrontmatter(content: string): Record<string, string> {
  const lines = content.split("\n");
  if (lines[0] !== "---") return {};
  const out: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") break;
    const m = (lines[i] ?? "").match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (m) out[m[1]!] = (m[2] ?? "").replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

/** Parse SecondBrain's local format `YYYY-MM-DD HH:MM AM/PM` → Date. */
function parseLocal(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) (AM|PM)$/);
  if (!m) return null;
  let h = parseInt(m[4]!, 10);
  if (m[6] === "PM" && h !== 12) h += 12;
  if (m[6] === "AM" && h === 12) h = 0;
  return new Date(parseInt(m[1]!, 10), parseInt(m[2]!, 10) - 1, parseInt(m[3]!, 10), h, parseInt(m[5]!, 10));
}

function pickLastUpdated(file: string, fm: Record<string, string>): { display: string; date: Date } {
  const candidates = [fm.last_updated, fm.modified, fm.created, fm.discovered].filter(Boolean) as string[];
  for (const c of candidates) {
    const localDate = parseLocal(c);
    if (localDate && !Number.isNaN(localDate.getTime())) return { display: c, date: localDate };
    const iso = new Date(c);
    if (!Number.isNaN(iso.getTime())) return { display: c, date: iso };
  }
  // Fall back to mtime.
  const st = statSync(file);
  return { display: st.mtime.toISOString(), date: st.mtime };
}

export async function listThinking(opts: { staleDays?: number } = {}): Promise<{
  thinking_dir: string;
  stale_days: number;
  notes: ThinkingNote[];
}> {
  const paths = await vaultPaths();
  const dir = paths.thinking;
  const staleDays = opts.staleDays ?? DEFAULT_STALE_DAYS;
  const now = Date.now();
  const notes: ThinkingNote[] = [];

  if (!existsSync(dir)) return { thinking_dir: dir, stale_days: staleDays, notes: [] };

  for (const file of walkMd(dir)) {
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch { continue; }
    const fm = parseFrontmatter(content);
    // Scope to in-flight thinking notes (old-spec §2.2.0b): `status: thinking`,
    // or no status at all (Council/RedTeam outputs in subfolders often carry no
    // frontmatter). A note explicitly promoted to another status — processed,
    // ready, archived — has left the thinking state and no longer nags.
    if (fm.status && fm.status !== "thinking") continue;
    const { display, date } = pickLastUpdated(file, fm);
    const age_ms = now - date.getTime();
    const age_days = Math.floor(age_ms / (1000 * 60 * 60 * 24));
    notes.push({
      file,
      rel: relative(paths.root, file),
      title: fm.title ?? basename(file).replace(/\.md$/, ""),
      last_updated: display,
      age_days,
      stale: age_days >= staleDays,
    });
  }
  // Oldest first.
  notes.sort((a, b) => b.age_days - a.age_days);

  return { thinking_dir: dir, stale_days: staleDays, notes };
}

function formatHuman(result: Awaited<ReturnType<typeof listThinking>>): string {
  if (result.notes.length === 0) {
    return `Thinking notes: 0 (in ${result.thinking_dir})`;
  }
  const lines: string[] = [`Thinking notes (${result.notes.length}, stale ≥${result.stale_days} days):`];
  for (const n of result.notes) {
    const mark = n.stale ? "⚠" : " ";
    lines.push(`  ${mark} ${String(n.age_days).padStart(4)}d  ${n.last_updated}  ${n.rel}`);
  }
  lines.push("");
  lines.push("Promote: move to inbox/raw/, drop status: thinking, re-run /process");
  lines.push("Archive: /page-archive <path> (deprecation header + git mv to 03_ARCHIVE/)");
  return lines.join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const sIdx = args.indexOf("--stale-days");
  const staleDays = sIdx >= 0 ? parseInt(args[sIdx + 1] ?? "", 10) : undefined;
  const result = await listThinking({ staleDays });
  if (jsonMode) console.log(JSON.stringify(result, null, 2));
  else console.log(formatHuman(result));
  process.exit(0);
}
