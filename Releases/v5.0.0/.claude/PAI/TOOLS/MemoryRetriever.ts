#!/usr/bin/env bun
/**
 * ============================================================================
 * MemoryRetriever — Compressed context retrieval over PAI's knowledge archive
 * ============================================================================
 *
 * PURPOSE:
 * Given a query string, searches the Obsidian vault ($VAULT_DIR/domains/**)
 * for entity notes (type: person|company|idea|research), ranks by BM25-lite
 * relevance, and returns compressed summaries within a token budget.
 * (Phase 11: knowledge lives in the vault, not PAI/MEMORY/KNOWLEDGE.)
 *
 * USAGE:
 *   bun MemoryRetriever.ts "query string"                    # Search, return compressed results
 *   bun MemoryRetriever.ts "query string" --top 5            # Return top 5 (default: 3)
 *   bun MemoryRetriever.ts "query string" --raw              # Skip compression, return raw excerpts
 *   bun MemoryRetriever.ts "query string" --budget 800       # Token budget for output (default: 500)
 *   bun MemoryRetriever.ts --help                            # Show usage
 *
 * SEARCH:
 *   BM25-style keyword matching + tag co-occurrence scoring.
 *   No embeddings, no vector DB — pure markdown + YAML frontmatter.
 *
 * COMPRESSION:
 *   Uses Inference.ts fast level for optional LLM compression of matched content.
 *   --raw flag skips compression and returns raw excerpts.
 *
 * STORAGE:
 *   Reads $VAULT_DIR/domains/** entity notes (filtered by type: frontmatter).
 *   NEVER writes or modifies files — read-only tool.
 *
 * ============================================================================
 */

import { parseArgs } from "util";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

// ============================================================================
// Configuration
// ============================================================================

const HOME = process.env.HOME!;
const PAI_DIR = process.env.PAI_DIR || path.join(HOME, ".claude", "PAI");

// Phase 11 — vault as single source of truth. Knowledge lives in the Obsidian
// vault as typed notes (`type: person|company|idea|research`), not the old
// PAI/MEMORY/KNOWLEDGE typed graph. Resolve the vault root and scan its
// domains/ for entity-typed notes, filtering by `type:` rather than folder.
function resolveVaultRoot(): string | null {
  const v = process.env.VAULT_DIR || process.env.OBSIDIAN_VAULT;
  return v && v.trim() ? v.trim().replace(/\/+$/, "") : null;
}
const VAULT_ROOT = resolveVaultRoot();
const KNOWLEDGE_DIR = VAULT_ROOT ? path.join(VAULT_ROOT, "domains") : "";
const ENTITY_TYPES = new Set(["person", "company", "idea", "research"]);

// BM25 parameters
const BM25_K1 = 1.5;
const BM25_B = 0.75;

// Scoring weights
const TITLE_MATCH_WEIGHT = 10;
const TAG_MATCH_WEIGHT = 5;
const RELATED_MATCH_WEIGHT = 3;

// Defaults
const DEFAULT_TOP = 3;
const DEFAULT_BUDGET = 500;
const MAX_EXCERPT_CHARS = 2000;

// ============================================================================
// Types
// ============================================================================

interface Frontmatter {
  title?: string;
  type?: string;
  domain?: string;
  tags?: string[];
  related?: string[];
  [key: string]: unknown;
}

interface KnowledgeNote {
  filePath: string;
  frontmatter: Frontmatter;
  body: string;
  wordCount: number;
}

interface ScoredNote {
  note: KnowledgeNote;
  score: number;
}

// ============================================================================
// Frontmatter Parsing
// ============================================================================

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const result: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      let value: string | string[] = line.substring(colonIdx + 1).trim();
      if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
        value = value.slice(1, -1).split(",").map((s: string) => s.trim().replace(/['"]/g, ""));
      }
      result[key] = value;
    }
  }

  const body = content.substring(match[0].length).trim();
  return { frontmatter: result, body };
}

// ============================================================================
// File Discovery
// ============================================================================

function discoverNotes(): KnowledgeNote[] {
  const notes: KnowledgeNote[] = [];
  if (!KNOWLEDGE_DIR || !fs.existsSync(KNOWLEDGE_DIR)) return notes;

  // Walk the vault's domains/ recursively; include only entity-typed notes
  // (type: person|company|idea|research). Folder layout is irrelevant — the
  // `type:` frontmatter is what makes a note part of the knowledge graph.
  const walk = (dir: string): void => {
    let entries: ReturnType<typeof fs.readdirSync>;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".md") || entry.name.startsWith("_")) continue;
      try {
        const content = fs.readFileSync(full, "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);
        const type = String(frontmatter.type ?? "").trim().toLowerCase();
        if (!ENTITY_TYPES.has(type)) continue;
        const wordCount = body.split(/\s+/).filter(Boolean).length;
        notes.push({ filePath: full, frontmatter, body, wordCount });
      } catch {
        // Skip unreadable files
      }
    }
  };
  walk(KNOWLEDGE_DIR);

  return notes;
}

// ============================================================================
// BM25-lite Scoring
// ============================================================================

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function computeBM25(
  termFreq: number,
  docLength: number,
  avgDocLength: number
): number {
  const tf = termFreq;
  const numerator = tf * (BM25_K1 + 1);
  const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / avgDocLength));
  return numerator / denominator;
}

function scoreNote(
  note: KnowledgeNote,
  queryTerms: string[],
  avgDocLength: number
): number {
  let score = 0;
  const titleLower = (note.frontmatter.title || "").toLowerCase();
  const bodyLower = note.body.toLowerCase();

  // Normalize tags to string array
  const tags: string[] = Array.isArray(note.frontmatter.tags)
    ? note.frontmatter.tags.map((t: string) => t.toLowerCase())
    : typeof note.frontmatter.tags === "string"
      ? [note.frontmatter.tags.toLowerCase()]
      : [];

  // Normalize related to string array
  const related: string[] = Array.isArray(note.frontmatter.related)
    ? note.frontmatter.related.map((r: string) => r.toLowerCase())
    : typeof note.frontmatter.related === "string"
      ? [note.frontmatter.related.toLowerCase()]
      : [];

  // Also extract [[wiki-link]] style related slugs from body
  const wikiLinks = note.body.match(/\[\[([^\]]+)\]\]/g) || [];
  const relatedSlugs = [
    ...related,
    ...wikiLinks.map((l) => l.replace(/\[\[|\]\]/g, "").toLowerCase()),
  ];

  for (const term of queryTerms) {
    // Title match: +10 per query term in title
    if (titleLower.includes(term)) {
      score += TITLE_MATCH_WEIGHT;
    }

    // Tag match: +5 per query term matching a tag
    for (const tag of tags) {
      if (tag.includes(term) || term.includes(tag)) {
        score += TAG_MATCH_WEIGHT;
        break; // One match per term per tag set
      }
    }

    // Related slug match: +3 per query term in related slugs
    for (const slug of relatedSlugs) {
      if (slug.includes(term)) {
        score += RELATED_MATCH_WEIGHT;
        break; // One match per term per related set
      }
    }

    // Content frequency: BM25-style scoring
    const termRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = bodyLower.match(termRegex);
    const tf = matches ? matches.length : 0;
    if (tf > 0) {
      score += computeBM25(tf, note.wordCount, avgDocLength);
    }
  }

  return score;
}

// ============================================================================
// Excerpt Extraction
// ============================================================================

function extractExcerpt(note: KnowledgeNote, queryTerms: string[]): string {
  const body = note.body;

  // Prioritized section headers to extract from
  const sectionPriority = ["## Thesis", "## Background", "## Key Findings", "## Key Facts", "## Context", "## Evidence", "## Summary"];

  for (const header of sectionPriority) {
    const idx = body.indexOf(header);
    if (idx === -1) continue;

    // Extract from header to next ## or end of content
    const afterHeader = body.substring(idx + header.length);
    const nextHeader = afterHeader.search(/\n## /);
    const section = nextHeader > -1
      ? afterHeader.substring(0, nextHeader).trim()
      : afterHeader.substring(0, MAX_EXCERPT_CHARS).trim();

    if (section.length > 20) {
      return section.substring(0, MAX_EXCERPT_CHARS);
    }
  }

  // Fallback: find the paragraph with the highest query term density
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 30);
  if (paragraphs.length === 0) return body.substring(0, MAX_EXCERPT_CHARS);

  let bestParagraph = paragraphs[0];
  let bestDensity = 0;

  for (const para of paragraphs) {
    const paraLower = para.toLowerCase();
    let hits = 0;
    for (const term of queryTerms) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = paraLower.match(regex);
      if (matches) hits += matches.length;
    }
    const density = hits / para.split(/\s+/).length;
    if (density > bestDensity) {
      bestDensity = density;
      bestParagraph = para;
    }
  }

  return bestParagraph.substring(0, MAX_EXCERPT_CHARS);
}

// ============================================================================
// LLM Compression via Inference.ts
// ============================================================================

function compress(text: string, budget: number): string {
  const inferPath = path.join(PAI_DIR, "Tools", "Inference.ts");

  if (!fs.existsSync(inferPath)) {
    // Fallback: truncate to approximate token count
    return text.substring(0, budget * 4);
  }

  const systemPrompt = `Compress the following knowledge note into a dense summary under ${budget} tokens. Preserve key facts, names, dates, and relationships. No filler. No preamble.`;
  const userPrompt = text.substring(0, MAX_EXCERPT_CHARS);

  const result = spawnSync(
    "bun",
    [inferPath, "--level", "fast", systemPrompt, userPrompt],
    { encoding: "utf-8", timeout: 15000 }
  );

  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }

  // Fallback: return truncated raw text
  return text.substring(0, budget * 4);
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatResults(
  query: string,
  results: ScoredNote[],
  summaries: string[],
  totalSearched: number
): string {
  const lines: string[] = [];

  lines.push(`\n  Memory Retrieval: "${query}"`);
  lines.push("  " + "-".repeat(45));

  if (results.length === 0) {
    lines.push("  No matching memories found.");
    lines.push("  " + "-".repeat(45));
    lines.push(`  Searched ${totalSearched} entity notes in the vault knowledge graph.`);
    return lines.join("\n");
  }

  for (let i = 0; i < results.length; i++) {
    const { note, score } = results[i];
    const title = note.frontmatter.title || path.basename(note.filePath, ".md");
    const type = note.frontmatter.type || "unknown";
    const summary = summaries[i];

    lines.push("");
    lines.push(`  [${title}] (type: ${type}, score: ${score.toFixed(1)})`);

    // Indent summary lines
    const summaryLines = summary.split("\n");
    for (const sl of summaryLines) {
      lines.push(`     ${sl}`);
    }
  }

  lines.push("");
  lines.push("  " + "-".repeat(45));
  lines.push(`  Retrieved ${results.length} results from ${totalSearched} notes searched.`);

  return lines.join("\n");
}

// ============================================================================
// Help
// ============================================================================

function printHelp(): void {
  console.log(`
MemoryRetriever — Compressed context retrieval over PAI's knowledge archive

USAGE:
  bun MemoryRetriever.ts "query string"                    Search, return compressed results
  bun MemoryRetriever.ts "query string" --top 5            Return top 5 (default: 3)
  bun MemoryRetriever.ts "query string" --raw              Skip compression, return raw excerpts
  bun MemoryRetriever.ts "query string" --budget 800       Token budget for output (default: 500)
  bun MemoryRetriever.ts --help                            Show this help

OPTIONS:
  --top <N>       Number of results to return (default: ${DEFAULT_TOP})
  --raw           Skip LLM compression, return raw excerpts
  --budget <N>    Token budget for compressed output (default: ${DEFAULT_BUDGET})
  --help          Show this help message

SEARCH:
  BM25-style keyword matching + tag co-occurrence scoring.
  Searches the Obsidian vault ($VAULT_DIR/domains/**) for entity notes
  carrying type: person|company|idea|research frontmatter.

COMPRESSION:
  Uses Inference.ts (fast level) for LLM-powered compression.
  --raw skips this step and returns raw excerpt text.

EXAMPLES:
  bun MemoryRetriever.ts "security policy stanford"
  bun MemoryRetriever.ts "agent architecture" --top 5 --raw
  bun MemoryRetriever.ts "ai consciousness" --budget 1000
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      top: { type: "string", short: "t" },
      raw: { type: "boolean", short: "r", default: false },
      budget: { type: "string", short: "b" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const query = positionals.join(" ").trim();
  if (!query) {
    console.error("Error: Query string required.\n");
    printHelp();
    process.exit(1);
  }

  const topN = values.top ? parseInt(values.top, 10) : DEFAULT_TOP;
  const raw = values.raw || false;
  const budget = values.budget ? parseInt(values.budget, 10) : DEFAULT_BUDGET;

  if (isNaN(topN) || topN < 1) {
    console.error("Error: --top must be a positive integer.");
    process.exit(1);
  }
  if (isNaN(budget) || budget < 50) {
    console.error("Error: --budget must be at least 50.");
    process.exit(1);
  }

  // Verify the vault is resolvable and its domains/ directory exists
  if (!VAULT_ROOT) {
    console.error(
      "Error: vault not found. Set $VAULT_DIR to your Obsidian vault path " +
      "(knowledge now lives in the vault, not PAI/MEMORY/KNOWLEDGE)."
    );
    process.exit(1);
  }
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error(`Error: vault domains/ directory not found: ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  // Discover all notes
  const notes = discoverNotes();
  if (notes.length === 0) {
    console.log(`\n  Memory Retrieval: "${query}"`);
    console.log("  " + "-".repeat(45));
    console.log("  No knowledge notes found in archive.");
    process.exit(0);
  }

  // Compute average document length for BM25
  const avgDocLength = notes.reduce((sum, n) => sum + n.wordCount, 0) / notes.length;

  // Tokenize query
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    console.error("Error: Query produced no searchable terms after tokenization.");
    process.exit(1);
  }

  // Score all notes
  const scored: ScoredNote[] = notes
    .map((note) => ({ note, score: scoreNote(note, queryTerms, avgDocLength) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  // Extract excerpts
  const excerpts = scored.map((s) => extractExcerpt(s.note, queryTerms));

  // Compress or use raw excerpts
  let summaries: string[];
  if (raw) {
    summaries = excerpts;
  } else {
    const perNoteBudget = Math.max(50, Math.floor(budget / Math.max(scored.length, 1)));
    summaries = scored.map((s, i) => compress(excerpts[i], perNoteBudget));
  }

  // Format and output
  const output = formatResults(query, scored, summaries, notes.length);
  console.log(output);
}

// ============================================================================
// Entry Point
// ============================================================================

if (import.meta.main) {
  main().catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
