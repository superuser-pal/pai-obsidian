#!/usr/bin/env bun
/**
 * ArchiveDomain.ts — deprecate a whole domain (Phase 12 §7.3 / old-spec §1.4).
 *
 * Phase 11–12 stance: archiving a domain doesn't physically move it. Obsidian
 * still sees the folder. The INDEX gets a deprecation header + `status:
 * archived` so the operator (and any tool that reads frontmatter) knows it's
 * dormant. Physical reorg / move is a manual call afterwards.
 *
 * Active-content protection (the load-bearing guard the fork lacked):
 * before applying, scan `01_PROJECTS/` for any project with
 * `status: planning | active`. If any are found, REFUSE — the user must
 * `/project-archive` each one first.
 *
 * Sequence (apply mode):
 *   1. Guard: walk 01_PROJECTS/PROJECT_*.md, fail if any are non-terminal
 *   2. Compute counts (pages, archived projects, last activity)
 *   3. Insert deprecation callout block at the top of INDEX.md body
 *   4. Promote INDEX frontmatter: `status: processed` → `archived`
 *   5. Update parent `domains/INDEX.md` if it exists — annotate the row
 *   6. Log {action: archive-domain, target_note: INDEX path, extra: reason}
 *
 * Usage:
 *   bun ArchiveDomain.ts --domain <Name> [--reason "..."]      # apply
 *   bun ArchiveDomain.ts --domain <Name> --dry-run --json      # preview
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";
import { logEvent } from "./IngestLog.ts";

type ActiveProject = { file: string; rel: string; status: string };

type Plan = {
  vault: string;
  domain: string;
  domain_path: string;
  index_path: string;
  active_projects: ActiveProject[];
  pages_count: number;
  archived_projects_count: number;
  proposed_header: string;
  blocked: boolean;
  reason: string;
};

function parseFrontmatter(content: string): { fm: Record<string, string>; fmEnd: number } {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { fm: {}, fmEnd: -1 };
  const fm: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return { fm, fmEnd: i };
    const m = (lines[i] ?? "").match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (m) fm[m[1]!] = (m[2] ?? "").replace(/^["']|["']$/g, "").trim();
  }
  return { fm, fmEnd: -1 };
}

function listActiveProjects(projectsDir: string): ActiveProject[] {
  if (!existsSync(projectsDir)) return [];
  const out: ActiveProject[] = [];
  for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (!/^PROJECT_[A-Z]/.test(entry.name)) continue;
    const file = join(projectsDir, entry.name);
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch { continue; }
    const { fm } = parseFrontmatter(content);
    const status = (fm.status ?? "").toLowerCase();
    if (status === "planning" || status === "active") {
      out.push({ file, rel: file, status });
    }
  }
  return out;
}

function countPages(pagesDir: string): number {
  if (!existsSync(pagesDir)) return 0;
  return readdirSync(pagesDir).filter((n) => n.endsWith(".md")).length;
}

function countArchivedProjects(archiveDir: string): number {
  if (!existsSync(archiveDir)) return 0;
  return readdirSync(archiveDir).filter((n) => /^PROJECT_[A-Z].*\.md$/.test(n)).length;
}

function localTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

function buildDeprecationHeader(reason: string): string {
  const ts = localTimestamp();
  const reasonLine = reason ? `> **Reason**: ${reason}` : `> **Reason**: not specified`;
  return [
    `> [!warning] Domain archived ${ts}`,
    reasonLine,
    `> Active projects must be archived first via \`/project-archive\`.`,
    `> Pages remain readable in Obsidian; the domain no longer accepts new content.`,
  ].join("\n");
}

export async function planArchiveDomain(opts: { domain: string; reason?: string }): Promise<Plan> {
  const paths = await vaultPaths();
  const domainPath = join(paths.domains, opts.domain);
  if (!existsSync(domainPath)) throw new Error(`domain not found: ${opts.domain}`);
  const stat = statSync(domainPath);
  if (!stat.isDirectory()) throw new Error(`not a directory: ${domainPath}`);
  const indexPath = join(domainPath, "INDEX.md");

  const active = listActiveProjects(join(domainPath, "01_PROJECTS"));
  const pages = countPages(join(domainPath, "02_PAGES"));
  const archived = countArchivedProjects(join(domainPath, "03_ARCHIVE"));
  const reason = opts.reason ?? "";

  return {
    vault: paths.root,
    domain: opts.domain,
    domain_path: domainPath,
    index_path: indexPath,
    active_projects: active,
    pages_count: pages,
    archived_projects_count: archived,
    proposed_header: buildDeprecationHeader(reason),
    blocked: active.length > 0,
    reason,
  };
}

export async function applyArchiveDomain(opts: { domain: string; reason?: string }): Promise<{
  plan: Plan;
  applied: boolean;
}> {
  const plan = await planArchiveDomain(opts);
  if (plan.blocked) {
    throw new Error(
      `domain "${plan.domain}" has ${plan.active_projects.length} active/planning project(s); ` +
      `archive each via /project-archive first:\n` +
      plan.active_projects.map((p) => `  - ${relative(plan.vault, p.file)} (status: ${p.status})`).join("\n"),
    );
  }
  if (!existsSync(plan.index_path)) {
    throw new Error(`INDEX.md missing for domain ${plan.domain}; run /create-domain to recreate, then re-archive`);
  }

  // Insert deprecation header at top of body + promote status: archived.
  const content = readFileSync(plan.index_path, "utf-8");
  const { fm, fmEnd } = parseFrontmatter(content);
  const lines = content.split("\n");
  const fmBlock = fmEnd >= 0 ? lines.slice(0, fmEnd + 1) : [];
  const body = fmEnd >= 0 ? lines.slice(fmEnd + 1).join("\n") : content;

  const newFm: string[] = [];
  let sawStatus = false;
  for (const l of fmBlock) {
    if (/^status:/.test(l)) { newFm.push("status: archived"); sawStatus = true; }
    else newFm.push(l);
  }
  if (!sawStatus && fmBlock.length > 0) {
    // insert before closing ---
    newFm.splice(newFm.length - 1, 0, "status: archived");
  }
  if (fmBlock.length === 0) {
    // No frontmatter — add a minimal block.
    newFm.push("---", "type: Note", "status: archived", `title: ${plan.domain}`, `domain: ${plan.domain}`, "---");
  }

  const newContent = [
    newFm.join("\n"),
    "",
    plan.proposed_header,
    "",
    body.trimStart(),
  ].join("\n");

  writeFileSync(plan.index_path, newContent, "utf-8");

  // Update parent domains/INDEX.md if it exists (best effort — annotate the line).
  const parentIndex = join(plan.vault, "domains", "INDEX.md");
  if (existsSync(parentIndex)) {
    const parent = readFileSync(parentIndex, "utf-8");
    const re = new RegExp(`^(- \\[\\[${plan.domain}\\]\\][^\\n]*)$`, "m");
    if (re.test(parent) && !/\barchived\b/i.test(parent.match(re)?.[0] ?? "")) {
      const annotated = parent.replace(re, "$1 _(archived)_");
      writeFileSync(parentIndex, annotated, "utf-8");
    }
  }

  await logEvent({
    action: "archive-domain",
    target_note: relative(plan.vault, plan.index_path),
    extra: { domain: plan.domain, reason: plan.reason },
  });

  return { plan, applied: true };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const domain = get("--domain");
  const reason = get("--reason");
  const dryRun = args.includes("--dry-run");
  const jsonMode = args.includes("--json");
  if (!domain) {
    console.error("usage: bun ArchiveDomain.ts --domain <Name> [--reason \"...\"] [--dry-run] [--json]");
    process.exit(1);
  }
  try {
    if (dryRun) {
      const plan = await planArchiveDomain({ domain, reason });
      if (jsonMode) console.log(JSON.stringify(plan, null, 2));
      else {
        console.log(`Domain: ${plan.domain}  (${plan.pages_count} page(s), ${plan.archived_projects_count} archived project(s))`);
        if (plan.blocked) {
          console.log(`BLOCKED: ${plan.active_projects.length} active/planning project(s):`);
          for (const p of plan.active_projects) console.log(`  ${relative(plan.vault, p.file)}  (status: ${p.status})`);
        } else {
          console.log("Ready to archive (--dry-run; no writes performed).");
        }
      }
      process.exit(plan.blocked ? 2 : 0);
    }
    const result = await applyArchiveDomain({ domain, reason });
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else console.log(`Archived: ${result.plan.domain} (INDEX promoted to status: archived)`);
    process.exit(0);
  } catch (e) {
    const msg = (e as Error).message;
    console.error(msg);
    process.exit(1);
  }
}
