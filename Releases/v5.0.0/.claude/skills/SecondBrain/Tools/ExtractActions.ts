#!/usr/bin/env bun
/**
 * ExtractActions.ts — scan a markdown file for `[action]` blocks (Phase 12 §4).
 *
 * Per old-spec §2.3.4 + Phase 8 vocabulary: only `[action]` markers extract
 * into the task system. `[todo]` is preserved inline (different semantics,
 * different tag — stays where the user wrote it).
 *
 * Block syntax (BrainDump-compatible):
 *
 *   [action] Send the deploy email by Friday
 *   [action] Schedule meeting with Bob
 *   about the Q3 release plan
 *   [idea] something else (closes the previous action block)
 *
 * Each `[action]` at the start of a line opens a block — optionally bulleted
 * (`- [action]` / `* [Action]`) and case-insensitive. The block body runs
 * until the next `[<category>]` marker (also bullet-tolerant) or end of input.
 * Body is trimmed; empty actions are skipped (no `- [ ]` lines with no text).
 *
 * Frontmatter is stripped before scanning so YAML lists that happen to contain
 * `[action]` as a tag value can't accidentally trigger extraction.
 *
 * Usage:
 *   bun ExtractActions.ts <file.md>          # human-readable list
 *   bun ExtractActions.ts <file.md> --json   # { source, actions: [{text, line}] }
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ActionItem = { text: string; line: number };

/** Strip --- ... --- frontmatter block at the very top, if present. */
function stripFrontmatter(content: string): { body: string; bodyOffsetLines: number } {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { body: content, bodyOffsetLines: 0 };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      return { body: lines.slice(i + 1).join("\n"), bodyOffsetLines: i + 1 };
    }
  }
  return { body: content, bodyOffsetLines: 0 };
}

export function extractActions(content: string): ActionItem[] {
  const { body, bodyOffsetLines } = stripFrontmatter(content);
  const lines = body.split("\n");
  const actions: ActionItem[] = [];

  let i = 0;
  while (i < lines.length) {
    const lineText = lines[i] ?? "";
    // Bullet-tolerant + case-insensitive: matches `[action] x`, `- [action] x`,
    // `* [Action] x`. Obsidian users naturally bullet their captures, and the
    // old-spec capture syntax (02-INBOX §2.1.2) is bulleted.
    const match = lineText.match(/^(?:[-*]\s+)?\[action\]\s+(.*)$/i);
    if (!match) {
      i += 1;
      continue;
    }
    const startLine = i;
    const buf: string[] = [(match[1] ?? "").trim()];
    i += 1;
    // Continue until we hit another [category] block or end of file.
    while (i < lines.length) {
      const cur = lines[i] ?? "";
      // Same prefix-tolerance as the opener so a bulleted `- [idea] ...` line
      // terminates the current action block instead of being absorbed into it.
      if (/^(?:[-*]\s+)?\[\w+\]/i.test(cur)) break;
      buf.push(cur);
      i += 1;
    }
    const text = buf.join("\n").trim();
    if (text.length > 0) {
      actions.push({ text, line: bodyOffsetLines + startLine + 1 });
    }
  }

  return actions;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath) {
    console.error("usage: bun ExtractActions.ts <file.md> [--json]");
    process.exit(1);
  }
  const abs = resolve(filePath);
  const content = readFileSync(abs, "utf-8");
  const actions = extractActions(content);
  if (jsonMode) {
    console.log(JSON.stringify({ source: abs, actions }, null, 2));
  } else {
    if (actions.length === 0) {
      console.log("(no [action] markers found)");
    } else {
      console.log(`${actions.length} [action] marker(s) in ${abs}`);
      for (const a of actions) {
        const oneLine = a.text.split("\n")[0];
        console.log(`  L${a.line}: ${oneLine}`);
      }
    }
  }
  process.exit(0);
}
