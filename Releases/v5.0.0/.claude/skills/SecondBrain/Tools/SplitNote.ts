#!/usr/bin/env bun
/**
 * SplitNote.ts — split a multi-topic note into per-section pages (Phase 12 §5).
 *
 * Per plan §175–198 / old-spec §2.3.6 — when a distributed note has 3+
 * independently page-worthy topics, offer to split into pages each carrying
 * `synthesized-from: ["[[<source>]]"]` + bidirectional `## Related` links.
 * Source gets `status: processed` (preserved — it's already there).
 *
 * Heuristic (locked-in for Phase 5): **count top-level `##` headings in the
 * body. If ≥3, propose split.** Simpler heuristics beat clever ones; the
 * workflow layer confirms per-section.
 *
 * Modes:
 *   --detect (default)            JSON describing the proposed split
 *   --apply --target-dir <dir>    Write children to <dir>; rewrite source
 *                                  to retain only intro + a Related map.
 *
 * Children naming: `<source-stem>--<section-slug>.md` (double-dash
 * separator). Preserves the relationship in the filename without colliding
 * with sibling notes that share the date prefix.
 *
 * Source's residual body keeps everything BEFORE the first `##` heading
 * (frontmatter + H1 + any intro) and appends a `## Related` section
 * listing the children.
 *
 * The tool is confirmation-FREE — that's the workflow's job. Atomicity:
 * `--apply` pre-checks every child path for collisions BEFORE writing any,
 * writes children first, then rewrites source; if any write fails, nothing
 * is deleted (sections aren't removed from source until after children are
 * written successfully).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

const SPLIT_THRESHOLD = 3;

/** Emit a YAML double-quoted scalar — safe for values that may contain a `:`
 *  (e.g. a section heading like "Process: Data Collection"). */
function yamlQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

type Section = {
  title: string;
  slug: string;
  body: string;
  startLine: number; // 1-based, in source file
};

type SplitPlan = {
  source: string;
  meets_threshold: boolean;
  section_count: number;
  threshold: number;
  intro: string;            // everything before first `## ` heading (post-frontmatter)
  frontmatter: string;      // raw frontmatter block (`---\n…\n---`) preserved
  sections: Section[];
  proposed_children: {
    filename: string;       // basename only
    title: string;
    related: string[];      // sibling basenames (no .md)
  }[];
};

function localTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitFrontmatter(content: string): { fm: string; body: string } {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { fm: "", body: content };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      return {
        fm: lines.slice(0, i + 1).join("\n") + "\n",
        body: lines.slice(i + 1).join("\n"),
      };
    }
  }
  return { fm: "", body: content };
}

function parseFrontmatterFields(fm: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = fm.split("\n").slice(1, -2); // drop fences
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    out[m[1]!] = (m[2] ?? "").replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

/** Slice the body into [intro, section[]] where intro is everything before
 *  the first `## ` line, and each section is `## Title` + content up to the
 *  next `## `. Skips empty sections (title only, no body). */
function sliceSections(body: string, frontmatterLineCount: number): { intro: string; sections: Section[] } {
  const lines = body.split("\n");
  const headingIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i] ?? "")) headingIdx.push(i);
  }
  if (headingIdx.length === 0) return { intro: body, sections: [] };

  const intro = lines.slice(0, headingIdx[0]).join("\n").trimEnd();
  const sections: Section[] = [];
  for (let h = 0; h < headingIdx.length; h++) {
    const start = headingIdx[h]!;
    const end = h + 1 < headingIdx.length ? headingIdx[h + 1]! : lines.length;
    const title = (lines[start] ?? "").replace(/^##\s+/, "").trim();
    const sectionBody = lines.slice(start + 1, end).join("\n").trim();
    if (sectionBody.length === 0) continue; // skip title-only
    sections.push({
      title,
      slug: slugify(title),
      body: sectionBody,
      startLine: frontmatterLineCount + start + 1,
    });
  }
  return { intro, sections };
}

export function planSplit(filePath: string): SplitPlan {
  const content = readFileSync(filePath, "utf-8");
  const { fm, body } = splitFrontmatter(content);
  const fmLineCount = fm ? fm.split("\n").length - 1 : 0;
  const { intro, sections } = sliceSections(body, fmLineCount);
  const sourceStem = basename(filePath).replace(/\.md$/i, "");
  const childFilenames = sections.map((s) => `${sourceStem}--${s.slug}.md`);
  const proposed_children = sections.map((s, i) => ({
    filename: childFilenames[i] ?? "",
    title: s.title,
    related: childFilenames
      .filter((_, j) => j !== i)
      .map((f) => f.replace(/\.md$/, "")),
  }));
  return {
    source: filePath,
    meets_threshold: sections.length >= SPLIT_THRESHOLD,
    section_count: sections.length,
    threshold: SPLIT_THRESHOLD,
    intro,
    frontmatter: fm,
    sections,
    proposed_children,
  };
}

/** Rewrite the source's frontmatter: ensure `status: processed` and add a
 *  `synthesizes:` list pointing at the children. (`type:` is left as-is — the
 *  source stays whatever it was; only the children are `type: Note`.) */
function rewriteSourceFrontmatter(fm: string, childStems: string[]): string {
  if (!fm) return fm;
  const lines = fm.trimEnd().split("\n");
  // Remove existing `synthesizes:` if present (replaced below).
  const filtered: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (/^synthesizes:/.test(line)) { skipping = true; continue; }
    if (skipping && /^\s+- /.test(line)) continue;
    skipping = false;
    filtered.push(line);
  }
  // Insert synthesizes before the closing ---.
  const closeIdx = filtered.lastIndexOf("---");
  const synthesized = [
    "synthesizes:",
    ...childStems.map((s) => `  - "[[${s}]]"`),
  ];
  filtered.splice(closeIdx, 0, ...synthesized);
  // Ensure status: processed.
  if (!filtered.some((l) => /^status:\s*processed/.test(l))) {
    const statusIdx = filtered.findIndex((l) => /^status:/.test(l));
    if (statusIdx >= 0) filtered[statusIdx] = "status: processed";
    else filtered.splice(1, 0, "status: processed");
  }
  return filtered.join("\n") + "\n";
}

function buildChildContent(plan: SplitPlan, idx: number): string {
  const section = plan.sections[idx]!;
  const child = plan.proposed_children[idx]!;
  const sourceFm = parseFrontmatterFields(plan.frontmatter);
  const sourceStem = basename(plan.source).replace(/\.md$/, "");

  // Pull a few fields from source where sensible; otherwise default.
  const tags = sourceFm.tags ?? "[]";
  const domain = sourceFm.domain ?? "";
  const fm = [
    "---",
    "type: Note",
    "status: processed",
    `created: ${localTimestamp()}`,
    "source: split",
    `discovered: ${localTimestamp()}`,
    `tags: ${tags}`,
    domain ? `domain: ${domain}` : "",
    `title: ${yamlQuote(child.title)}`,
    "synthesized-from:",
    `  - "[[${sourceStem}]]"`,
    "---",
  ].filter(Boolean).join("\n");

  const relatedLines =
    child.related.length === 0
      ? "_(no siblings — this is the only split child)_"
      : child.related.map((r) => `- [[${r}]]`).join("\n");

  return [
    fm,
    "",
    `# ${child.title}`,
    "",
    section.body,
    "",
    "## Related",
    "",
    relatedLines,
    `- [[${sourceStem}]] _(source)_`,
    "",
  ].join("\n");
}

function buildResidualSource(plan: SplitPlan): string {
  const newFm = rewriteSourceFrontmatter(
    plan.frontmatter,
    plan.proposed_children.map((c) => c.filename.replace(/\.md$/, "")),
  );
  const introTrimmed = plan.intro.trimEnd();
  const relatedBlock = [
    "## Related",
    "",
    ...plan.proposed_children.map((c) => `- [[${c.filename.replace(/\.md$/, "")}]] — ${c.title}`),
    "",
  ].join("\n");
  return [
    newFm.trimEnd(),
    "",
    introTrimmed,
    introTrimmed ? "" : null,
    relatedBlock,
  ].filter((s) => s !== null).join("\n");
}

export function applySplit(plan: SplitPlan, targetDir: string): {
  written: string[];
  source: string;
} {
  if (!plan.meets_threshold) {
    throw new Error(`Split threshold not met: ${plan.section_count} sections (need ≥${plan.threshold})`);
  }
  if (!existsSync(targetDir)) {
    throw new Error(`target-dir does not exist: ${targetDir}`);
  }
  const written: string[] = [];
  const childPaths = plan.proposed_children.map((c) => `${targetDir}/${c.filename}`);
  // Pre-check EVERY child path before writing any. Otherwise a collision on a
  // later child would throw mid-batch, leaving earlier children on disk with the
  // source not yet rewritten — duplicated content needing manual cleanup.
  for (const path of childPaths) {
    if (existsSync(path)) {
      throw new Error(`child already exists, refusing to overwrite: ${path}`);
    }
  }
  // Write children first.
  for (let i = 0; i < plan.sections.length; i++) {
    const content = buildChildContent(plan, i);
    writeFileSync(childPaths[i]!, content, "utf-8");
    written.push(childPaths[i]!);
  }
  // Then rewrite source.
  const residual = buildResidualSource(plan);
  writeFileSync(plan.source, residual, "utf-8");
  return { written, source: plan.source };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const apply = args.includes("--apply");
  const targetIdx = args.indexOf("--target-dir");
  const targetDir = targetIdx >= 0 ? args[targetIdx + 1] : undefined;
  const filePath = args.find((a) => !a.startsWith("--") && a !== targetDir);
  if (!filePath) {
    console.error("usage: bun SplitNote.ts <file.md> [--json] [--apply --target-dir <dir>]");
    process.exit(1);
  }
  const abs = resolve(filePath);
  const plan = planSplit(abs);
  if (apply) {
    if (!targetDir) {
      console.error("--apply requires --target-dir <dir>");
      process.exit(1);
    }
    const result = applySplit(plan, resolve(targetDir));
    if (jsonMode) {
      console.log(JSON.stringify({ ...plan, applied: true, written: result.written }, null, 2));
    } else {
      console.log(`Split applied: ${result.written.length} child page(s) written; source rewritten.`);
      for (const w of result.written) console.log(`  ${w}`);
    }
    process.exit(0);
  }
  if (jsonMode) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(`Source: ${plan.source}`);
    console.log(`Sections: ${plan.section_count} (threshold ≥${plan.threshold}) — ${plan.meets_threshold ? "MEETS" : "below"} threshold`);
    for (const c of plan.proposed_children) {
      console.log(`  → ${c.filename}  (${c.title})`);
    }
  }
  process.exit(0);
}
