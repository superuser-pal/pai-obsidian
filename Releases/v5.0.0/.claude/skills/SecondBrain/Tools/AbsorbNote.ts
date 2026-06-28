#!/usr/bin/env bun
/**
 * AbsorbNote.ts — atomic absorb of a source note into a target page
 * (Phase 12 §5 — old-spec §2.3.7).
 *
 * Save.md already does ≥80% qmd-similarity dedup ("half of Absorb" per
 * plan §188); Distribute.md's idempotency path also offers a merge. This
 * tool formalizes the full sequence as one atomic call so the workflow
 * can't half-finish (e.g. snapshot taken but source not deleted, or
 * source appended into target twice).
 *
 * Sequence:
 *   1. Snapshot the source to $PAI_DIR/MEMORY/ARCHIVE/secondbrain-snapshots/
 *   2. Append source body (or named --section) to target under an
 *      "## Absorbed from <source-stem>" heading, demoting the absorbed
 *      content's headings so they nest beneath it (no H1 collision)
 *   3. Log {action: absorb, source_note, target_note} to IngestLog
 *   4. Delete the source file
 *
 * If step 2 fails, source stays. If step 4 fails, the snapshot still
 * exists and IngestLog has the absorb event — the workflow can re-run
 * deletion manually. The "atomic" guarantee is: target either gets the
 * full source content or none; the snapshot always precedes the append.
 *
 * Usage:
 *   bun AbsorbNote.ts --source <path> --target <path> [--section <heading>]
 *                     [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, copyFileSync } from "node:fs";
import { resolve, basename, relative } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";
import { logEvent } from "./IngestLog.ts";

function bodyOf(content: string): string {
  const lines = content.split("\n");
  if (lines[0] !== "---") return content;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(i + 1).join("\n");
  }
  return content;
}

/** Extract a single `## <name>` section from a markdown body (heading + body). */
function extractSection(body: string, heading: string): string | null {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i] ?? "")) { end = i; break; }
  }
  return lines.slice(start, end).join("\n").trimEnd();
}

function snapshotTimestamp(d = new Date()): string {
  // Local-time components, deliberately NO `Z` suffix — these are LOCAL wall-clock
  // stamps (matching the vault's `YYYY-MM-DD HH:MM AM/PM` convention), not UTC. A
  // trailing `Z` would mislabel them as Zulu time.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Demote ATX headings by `by` levels (clamped to h6) so absorbed content nests
 * under the `## Absorbed from` wrapper instead of colliding — e.g. a source `# H1`
 * would otherwise land mid-page as a top-level heading. Headings inside fenced
 * code blocks (``` / ~~~) are left untouched.
 */
function demoteHeadings(md: string, by = 2): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^(```|~~~)/.test(line)) { inFence = !inFence; return line; }
      if (inFence) return line;
      const h = line.match(/^(#{1,6})(\s+)(.*)$/);
      if (!h) return line;
      const level = Math.min(6, h[1]!.length + by);
      return `${"#".repeat(level)}${h[2]!}${h[3]!}`;
    })
    .join("\n");
}

export type AbsorbOpts = {
  source: string;
  target: string;
  section?: string;
  dryRun?: boolean;
};

export type AbsorbResult = {
  snapshot: string;
  appendedHeading: string;
  bytesAppended: number;
  sourceDeleted: boolean;
};

export async function absorb(opts: AbsorbOpts): Promise<AbsorbResult> {
  const source = resolve(opts.source);
  const target = resolve(opts.target);
  if (!existsSync(source)) throw new Error(`source not found: ${source}`);
  if (!existsSync(target)) throw new Error(`target not found: ${target}`);
  if (source === target) throw new Error(`source and target are the same file`);

  const paths = await vaultPaths();
  const snapDir = paths.memoryArchive; // .../MEMORY/ARCHIVE/secondbrain-snapshots
  const sourceStem = basename(source).replace(/\.md$/, "");
  const snapshotPath = `${snapDir}/${snapshotTimestamp()}-${sourceStem}.md`;

  const sourceContent = readFileSync(source, "utf-8");
  const sourceBody = bodyOf(sourceContent);

  let toAppend: string;
  if (opts.section) {
    const section = extractSection(sourceBody, opts.section);
    if (section === null) {
      throw new Error(`section not found in source: "## ${opts.section}"`);
    }
    toAppend = section;
  } else {
    toAppend = sourceBody.trim();
  }

  // Nest the absorbed content beneath the `## Absorbed from` wrapper (level 2)
  // by demoting its headings — avoids a source H1 colliding with the target page.
  toAppend = demoteHeadings(toAppend);

  const targetContent = readFileSync(target, "utf-8");
  const heading = `## Absorbed from ${sourceStem}`;
  const appended = [
    targetContent.trimEnd(),
    "",
    heading,
    "",
    toAppend,
    "",
  ].join("\n");

  if (opts.dryRun) {
    return {
      snapshot: snapshotPath,
      appendedHeading: heading,
      bytesAppended: toAppend.length,
      sourceDeleted: false,
    };
  }

  // 1. Snapshot
  if (!existsSync(snapDir)) mkdirSync(snapDir, { recursive: true });
  copyFileSync(source, snapshotPath);

  // 2. Append
  writeFileSync(target, appended, "utf-8");

  // 3. Log
  await logEvent({
    action: "absorb",
    source_note: relative(paths.root, source),
    target_note: relative(paths.root, target),
    extra: { snapshot: relative(paths.root, snapshotPath) },
  });

  // 4. Delete source
  let sourceDeleted = false;
  try {
    unlinkSync(source);
    sourceDeleted = true;
  } catch {
    // Leave for the workflow to clean up — snapshot + log are already in place.
  }

  return {
    snapshot: snapshotPath,
    appendedHeading: heading,
    bytesAppended: toAppend.length,
    sourceDeleted,
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const source = get("--source");
  const target = get("--target");
  const section = get("--section");
  const dryRun = args.includes("--dry-run");
  if (!source || !target) {
    console.error("usage: bun AbsorbNote.ts --source <path> --target <path> [--section <heading>] [--dry-run]");
    process.exit(1);
  }
  try {
    const result = await absorb({ source, target, section, dryRun });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`absorb failed: ${(e as Error).message}`);
    process.exit(1);
  }
}
