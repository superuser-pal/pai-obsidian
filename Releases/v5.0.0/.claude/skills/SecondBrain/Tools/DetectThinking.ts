#!/usr/bin/env bun
/**
 * DetectThinking.ts — heuristic: does this raw note look like reasoning?
 * (Phase 12 §6 / old-spec §2.2.0)
 *
 * `/capture --thinking` already routes explicitly to `thinking/`. This tool
 * covers the case where a user dropped a reasoning note into `inbox/raw/`
 * WITHOUT the flag — `/process` calls it per file and offers (confirmed) to
 * route the file to `thinking/` with `status: thinking` instead of the usual
 * `inbox/ready/` with `status: ready`.
 *
 * Signals (each independently triggers; workflow confirms, so false
 * positives cost one "no"):
 *
 *   S1  tag_thinking      frontmatter `tags:` includes "thinking" or "question"
 *   S2  category_marker   body opens with `[thinking]` or `[question]` category
 *   S3  thinking_phrase   body contains a phrase from a small fixed list
 *   S4  question_density  ≥30% of body sentences end in `?`
 *
 * `is_thinking` is true if ANY signal fires. The workflow always confirms.
 *
 * Usage:
 *   bun DetectThinking.ts <file.md>           # human-readable
 *   bun DetectThinking.ts <file.md> --json    # { file, is_thinking, signals, confidence }
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseFrontmatter, fmTags } from "./Frontmatter.ts";

const THINKING_PHRASES = [
  "thinking through",
  "let me reason",
  "let me think",
  "wondering if",
  "wondering whether",
  "open question",
  "still figuring out",
  "not sure if",
  "not sure whether",
  "trying to work out",
];

type Signals = {
  tag_thinking: boolean;
  category_marker: boolean;
  thinking_phrase: boolean;
  question_density: boolean;
};

function detectSignals(content: string): Signals {
  const { body, fm } = parseFrontmatter(content);
  const lower = body.toLowerCase();

  // Block-list-aware tag parsing (audit M7): `tags:\n  - thinking` now matches.
  const tags = fmTags(fm).map((t) => t.toLowerCase());
  const tag_thinking = tags.includes("thinking") || tags.includes("question");

  const trimmed = body.trimStart();
  const category_marker = /^\[(thinking|question)\]/i.test(trimmed);

  const thinking_phrase = THINKING_PHRASES.some((p) => lower.includes(p));

  // Question density: count "sentences" by splitting on punctuation + whitespace.
  const sentenceEnders = body.match(/[.!?]+(?=\s|$)/g) ?? [];
  const questionEnders = body.match(/\?+(?=\s|$)/g) ?? [];
  const total = sentenceEnders.length;
  const question_density = total >= 3 && questionEnders.length / total >= 0.3;

  return { tag_thinking, category_marker, thinking_phrase, question_density };
}

export type DetectResult = {
  file: string;
  is_thinking: boolean;
  signals: Signals;
  confidence: number;
};

export function detect(filePath: string): DetectResult {
  const content = readFileSync(filePath, "utf-8");
  const signals = detectSignals(content);
  const fired = Object.values(signals).filter(Boolean).length;
  const is_thinking = fired > 0;
  const confidence = fired / Object.keys(signals).length;
  return { file: filePath, is_thinking, signals, confidence };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath) {
    console.error("usage: bun DetectThinking.ts <file.md> [--json]");
    process.exit(1);
  }
  const result = detect(resolve(filePath));
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const tag = result.is_thinking ? "THINKING" : "ready";
    console.log(`${tag}  conf=${result.confidence.toFixed(2)}  ${result.file}`);
    const fired = Object.entries(result.signals).filter(([, v]) => v).map(([k]) => k);
    if (fired.length > 0) console.log(`  signals: ${fired.join(", ")}`);
  }
  process.exit(0);
}
