#!/usr/bin/env bun
/**
 * KnowledgeHarvester — read-side health + analysis over the vault knowledge graph.
 *
 * Phase 11 (vault as single source of truth). Knowledge entities now live in the
 * Obsidian vault as typed notes (`type: person|company|idea|research`) under
 * $VAULT_DIR/domains/**, queried via bases/Knowledge.base. This tool no longer
 * writes a separate MEMORY/KNOWLEDGE typed graph and no longer runs the intake
 * scanners (auto-memory / WORK / RESEARCH) or the _harvest-queue drain — those
 * were superseded by SecondBrain's capture → distribute → ripple flow and by
 * `SessionHarvester --mine` (which now stages candidates into inbox/ready/).
 *
 * Commands:
 *   status           Archive health dashboard (counts, quality, orphan links)
 *   contradictions   Note pairs with high tag overlap (candidates for review)
 *   harvest          DEPRECATED — entities now come from SecondBrain/ripple
 *   index            DEPRECATED — MOCs replaced by bases/Knowledge.base
 *
 * Examples:
 *   bun KnowledgeHarvester.ts status
 *   bun KnowledgeHarvester.ts contradictions
 */

import { parseArgs } from "util";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Configuration — vault-rooted (Phase 11)
// ============================================================================

function resolveVaultRoot(): string | null {
  const v = process.env.VAULT_DIR || process.env.OBSIDIAN_VAULT;
  return v && v.trim() ? v.trim().replace(/\/+$/, "") : null;
}
const VAULT_ROOT = resolveVaultRoot();
// Entities may live anywhere under domains/; the `type:` frontmatter — not the
// folder — determines membership and the domain label.
const KNOWLEDGE_DIR = VAULT_ROOT ? path.join(VAULT_ROOT, "domains") : "";
const TYPE_TO_DOMAIN: Record<string, string> = {
  person: "People",
  company: "Companies",
  idea: "Ideas",
  research: "Research",
};
const DOMAINS = Object.values(TYPE_TO_DOMAIN);
const SEEDLING_EXPIRY_DAYS = 90;

interface EntityNote {
  filePath: string;
  slug: string;
  domain: string;
  type: string;
  fm: Record<string, any>;
  content: string;
}

// ============================================================================
// Frontmatter + collection
// ============================================================================

function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, any> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      let value: any = line.substring(colonIdx + 1).trim();
      if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
        value = value.slice(1, -1).split(",").map((s: string) => s.trim().replace(/['"]/g, "")).filter(Boolean);
      }
      result[key] = value;
    }
  }
  return result;
}

/** Recursively collect entity-typed notes from the vault's domains/. */
function collectEntityNotes(): EntityNote[] {
  const notes: EntityNote[] = [];
  if (!KNOWLEDGE_DIR || !fs.existsSync(KNOWLEDGE_DIR)) return notes;

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
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
        const fm = parseFrontmatter(content);
        const type = String(fm.type ?? "").trim().toLowerCase();
        if (!(type in TYPE_TO_DOMAIN)) continue;
        notes.push({
          filePath: full,
          slug: entry.name.replace(/\.md$/, ""),
          domain: TYPE_TO_DOMAIN[type]!,
          type,
          fm,
          content,
        });
      } catch {
        // Skip unreadable notes.
      }
    }
  };
  walk(KNOWLEDGE_DIR);
  return notes;
}

function noteTags(fm: Record<string, any>): string[] {
  if (Array.isArray(fm.tags)) return fm.tags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean);
  if (typeof fm.tags === "string") {
    return fm.tags.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim().replace(/['"]/g, "").toLowerCase()).filter(Boolean);
  }
  return [];
}

// ============================================================================
// status
// ============================================================================

function cmdStatus(): void {
  console.log("📊 Knowledge Archive Status (vault)");
  console.log("─".repeat(40));
  if (!VAULT_ROOT) {
    console.error("  $VAULT_DIR not set — knowledge now lives in the vault. Set it and retry.");
    process.exit(1);
  }

  const notes = collectEntityNotes();
  const byDomain: Record<string, number> = {};
  const byQuality: Record<string, number> = {};
  const allSlugs = new Set<string>();
  const allLinks = new Set<string>();
  const staleSeedlings: string[] = [];

  for (const n of notes) {
    byDomain[n.domain] = (byDomain[n.domain] || 0) + 1;
    allSlugs.add(n.slug.toLowerCase());

    const quality = typeof n.fm.quality === "number" ? n.fm.quality : (n.fm.quality ? parseInt(n.fm.quality) : 5);
    const bucket = quality <= 3 ? "low (0-3)" : quality <= 6 ? "medium (4-6)" : "high (7-10)";
    byQuality[bucket] = (byQuality[bucket] || 0) + 1;

    for (const m of n.content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      allLinks.add(m[1]!.trim().toLowerCase().replace(/\s+/g, "-"));
    }

    if (quality <= 2 && n.fm.created) {
      const created = new Date(n.fm.created);
      if (!isNaN(created.getTime())) {
        const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (days > SEEDLING_EXPIRY_DAYS) staleSeedlings.push(`${n.domain}/${n.slug}`);
      }
    }
  }

  const orphanLinks = [...allLinks].filter((l) => !allSlugs.has(l) && !l.includes("_index") && !l.includes("_schema"));

  console.log(`  Total entity notes: ${notes.length}`);
  console.log();
  console.log("  By type:");
  for (const d of DOMAINS) if (byDomain[d]) console.log(`    ${d}: ${byDomain[d]}`);
  console.log();
  console.log("  By quality:");
  for (const [bucket, count] of Object.entries(byQuality)) console.log(`    ${bucket}: ${count}`);

  if (orphanLinks.length > 0) {
    console.log(`\n  ⚠️  Orphan wikilinks (${orphanLinks.length}):`);
    for (const link of orphanLinks.slice(0, 10)) console.log(`    [[${link}]]`);
    if (orphanLinks.length > 10) console.log(`    ... and ${orphanLinks.length - 10} more`);
  }
  if (staleSeedlings.length > 0) {
    console.log(`\n  🥀 Stale low-quality notes (>${SEEDLING_EXPIRY_DAYS}d, quality ≤2):`);
    for (const s of staleSeedlings) console.log(`    ${s}`);
  }
  console.log(`\n  Query/browse: bases/Knowledge.base`);
}

// ============================================================================
// contradictions
// ============================================================================

function temporalWindowsOverlap(a: Record<string, any>, b: Record<string, any>): boolean {
  const aFrom = a.valid_from ? new Date(a.valid_from).getTime() : 0;
  const aUntil = a.valid_until ? new Date(a.valid_until).getTime() : Infinity;
  const bFrom = b.valid_from ? new Date(b.valid_from).getTime() : 0;
  const bUntil = b.valid_until ? new Date(b.valid_until).getTime() : Infinity;
  return aFrom <= bUntil && bFrom <= aUntil;
}

function cmdContradictions(): void {
  console.log("🔍 Contradiction Candidates (vault)");
  console.log("─".repeat(40));
  if (!VAULT_ROOT) {
    console.error("  $VAULT_DIR not set. Set it and retry.");
    process.exit(1);
  }

  const notes = collectEntityNotes()
    .map((n) => ({ ...n, tags: noteTags(n.fm) }))
    .filter((n) => n.tags.length > 0);

  const pairs: Array<{ a: typeof notes[0]; b: typeof notes[0]; shared: string[] }> = [];
  let temporalSkipped = 0;

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const shared = notes[i]!.tags.filter((t) => notes[j]!.tags.includes(t));
      if (shared.length < 2) continue;
      const hasTemporal = notes[i]!.fm.valid_from || notes[i]!.fm.valid_until || notes[j]!.fm.valid_from || notes[j]!.fm.valid_until;
      if (hasTemporal && !temporalWindowsOverlap(notes[i]!.fm, notes[j]!.fm)) { temporalSkipped++; continue; }
      pairs.push({ a: notes[i]!, b: notes[j]!, shared });
    }
  }
  pairs.sort((x, y) => y.shared.length - x.shared.length);

  if (pairs.length === 0) {
    console.log("  No note pairs with 2+ shared tags found.");
    if (temporalSkipped > 0) console.log(`  (${temporalSkipped} pair(s) skipped — non-overlapping temporal windows)`);
    return;
  }
  console.log(`  Found ${pairs.length} pair(s) with 2+ shared tags:\n`);
  for (const p of pairs.slice(0, 20)) {
    console.log(`  📋 ${p.shared.length} shared: [${p.shared.join(", ")}]`);
    console.log(`     A: ${p.a.domain}/${p.a.slug}`);
    console.log(`     B: ${p.b.domain}/${p.b.slug}\n`);
  }
  if (pairs.length > 20) console.log(`  ... and ${pairs.length - 20} more pairs.`);
}

// ============================================================================
// Deprecated commands
// ============================================================================

function cmdHarvestDeprecated(): void {
  console.log("ℹ️  `harvest` is deprecated (Phase 11: vault as single source of truth).");
  console.log("    Entity notes are now created by:");
  console.log("      • SecondBrain capture → /distribute (ripples [[entities]] into the vault)");
  console.log("      • bun SessionHarvester.ts --mine  (stages candidates into inbox/ready/)");
  console.log("    There is no separate MEMORY/KNOWLEDGE graph to harvest into anymore.");
}

function cmdIndexDeprecated(): void {
  console.log("ℹ️  `index` is deprecated — MOC dashboards are replaced by bases/Knowledge.base.");
  console.log("    Open the Base in Obsidian for table/card views grouped by type.");
}

// ============================================================================
// CLI
// ============================================================================

const { positionals } = parseArgs({
  args: process.argv.slice(2),
  options: { help: { type: "boolean", short: "h" } },
  allowPositionals: true,
  strict: false,
});

const command = positionals[0] || "status";

switch (command) {
  case "status": cmdStatus(); break;
  case "contradictions": cmdContradictions(); break;
  case "harvest": cmdHarvestDeprecated(); break;
  case "index": cmdIndexDeprecated(); break;
  default:
    console.error(`Unknown command: ${command}. Use: status | contradictions`);
    process.exit(1);
}
