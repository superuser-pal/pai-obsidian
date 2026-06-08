#!/usr/bin/env bun
/**
 * ResolveDomain.ts — classify a note → target `domains/<Name>` for `/distribute`.
 *
 * Strategy (in order, first hit wins):
 *
 *   1. Frontmatter `domain:` field — explicit user intent, never overridden.
 *   2. Path hint — if file is under `inbox/ready/<DomainName>/...`, that's the target.
 *   3. Tag match — frontmatter `tags:` includes a known domain name.
 *   4. Wikilink density — count `[[X]]` occurrences against each domain's
 *      `INDEX.md`; the most-linked domain wins (must beat next-best by ≥2).
 *   5. Otherwise: `UNCLEAR` (user picks).
 *
 * Outputs JSON to stdout. Never auto-creates domains; that's `/create-domain`.
 *
 * Usage:
 *   bun ResolveDomain.ts <path/to/note.md>
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveRoot } from "./ResolveRoot.ts";

type Resolution = {
  target: string | null;
  reason: "frontmatter" | "path" | "tag" | "wikilink" | "unclear";
  candidates: { name: string; score: number; signal: string }[];
};

function parseFrontmatter(content: string): { fm: Record<string, unknown>; body: string } {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { fm: {}, body: content };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) return { fm: {}, body: content };
  const fm: Record<string, unknown> = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    const inline = m[2]!.match(/^\[(.*)\]$/);
    fm[m[1]!] = inline ? inline[1]!.split(",").map((s) => s.trim()) : m[2]!.replace(/^["']|["']$/g, "");
  }
  return { fm, body: lines.slice(end + 1).join("\n") };
}

function listDomains(root: string): string[] {
  const domainsDir = join(root, "domains");
  if (!existsSync(domainsDir)) return [];
  return readdirSync(domainsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);
}

function countWikilinks(body: string, target: string): number {
  const re = new RegExp(`\\[\\[${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\||\\])`, "g");
  return (body.match(re) || []).length;
}

export async function resolveDomain(notePath: string): Promise<Resolution> {
  const content = readFileSync(notePath, "utf-8");
  const { fm, body } = parseFrontmatter(content);
  const root = await resolveRoot();
  const domains = listDomains(root);

  // 1. Explicit frontmatter
  if (typeof fm.domain === "string" && fm.domain.trim()) {
    return { target: fm.domain.trim(), reason: "frontmatter", candidates: [{ name: fm.domain.trim(), score: Infinity, signal: "frontmatter.domain" }] };
  }

  // 2. Path hint — inbox/ready/<DomainName>/...
  const inboxReadyMatch = notePath.match(/\/inbox\/ready\/([^/]+)\/[^/]+$/);
  if (inboxReadyMatch && domains.includes(inboxReadyMatch[1]!)) {
    return { target: inboxReadyMatch[1]!, reason: "path", candidates: [{ name: inboxReadyMatch[1]!, score: Infinity, signal: "path:inbox/ready/<name>/" }] };
  }

  // 3. Tag match
  if (Array.isArray(fm.tags)) {
    const tagHit = (fm.tags as string[]).find((t) => domains.includes(t));
    if (tagHit) {
      return { target: tagHit, reason: "tag", candidates: [{ name: tagHit, score: Infinity, signal: `tag:${tagHit}` }] };
    }
  }

  // 4. Wikilink density
  const candidates = domains
    .map((name) => ({ name, score: countWikilinks(body, name), signal: `wikilink:${name}` }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    const top = candidates[0]!;
    const second = candidates[1]?.score ?? 0;
    if (top.score - second >= 2) {
      return { target: top.name, reason: "wikilink", candidates };
    }
  }

  return { target: null, reason: "unclear", candidates };
}

if (import.meta.main) {
  const [notePath] = process.argv.slice(2);
  if (!notePath) {
    console.error("usage: bun ResolveDomain.ts <note.md>");
    process.exit(1);
  }
  if (!statSync(notePath).isFile()) {
    console.error(`not a file: ${notePath}`);
    process.exit(1);
  }
  const r = await resolveDomain(notePath);
  console.log(JSON.stringify(r, null, 2));
}
