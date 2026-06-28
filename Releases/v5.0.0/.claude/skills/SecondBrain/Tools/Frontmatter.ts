/**
 * Frontmatter.ts — shared block-list-aware YAML-frontmatter parser for the
 * SecondBrain tools (Phase 12, audit M7).
 *
 * Obsidian's Properties editor writes list values in block form
 * (`tags:\n  - a\n  - b`), which the per-tool inline-only parsers in
 * DetectThinking / ResolveDomain silently dropped — so a block-style
 * `tags:\n  - thinking` never matched. This is the single source of truth and
 * mirrors Qmd/Tools/LintFrontmatter.ts `parseFrontmatter`.
 *
 * Handles `key: value`, `key: [a, b]`, and `key:\n  - a\n  - b`. Anything more
 * exotic falls through as a string.
 */

export type Frontmatter = Record<string, unknown>;

export function parseFrontmatter(content: string): { fm: Frontmatter; body: string } {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { fm: {}, body: content };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) return { fm: {}, body: content };

  const fm: Frontmatter = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;
  for (const line of lines.slice(1, end)) {
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

  return { fm, body: lines.slice(end + 1).join("\n") };
}

/** Normalize a frontmatter `tags:` field to a string[] (inline or block form). */
export function fmTags(fm: Frontmatter): string[] {
  const t = fm.tags;
  if (Array.isArray(t)) return (t as unknown[]).map((x) => String(x).trim()).filter(Boolean);
  if (typeof t === "string" && t.trim()) return [t.trim()];
  return [];
}
