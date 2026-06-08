#!/usr/bin/env bun
/**
 * QueueUpdate.ts — manage the pending-distribution queue at
 * `.claude/PAI/MEMORY/STATE/secondbrain-queue.md` (gitignored).
 *
 * Why a markdown queue (not jsonl): the queue is intended for human inspection
 * during `/open-day` and `/close-day`. JSONL is for machine events; STATE is
 * for the operator's working memory between sessions.
 *
 * File shape:
 *
 *   # SecondBrain — pending distribution queue
 *
 *   _Last updated: 2026-05-19T14:32:11Z_
 *
 *   ## Pending
 *
 *   - [ ] `inbox/ready/foo.md` — Foo title (queued 2026-05-19T14:30Z)
 *   - [ ] `inbox/ready/bar.md` — Bar title (queued 2026-05-19T14:31Z)
 *
 *   ## Done (last 7 days)
 *
 *   - [x] `inbox/ready/baz.md` → `domains/Work/02_PAGES/baz.md` (2026-05-18T09:11Z)
 *
 * Usage:
 *   bun QueueUpdate.ts add <relpath> [--title "Title"]
 *   bun QueueUpdate.ts complete <relpath> --target <relpath>
 *   bun QueueUpdate.ts list [--pending|--done]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";

const HEADER = "# SecondBrain — pending distribution queue\n\n";
const PENDING_HEAD = "## Pending\n";
const DONE_HEAD = "## Done (last 7 days)\n";

async function queueFile(): Promise<string> {
  const { memoryState } = await vaultPaths();
  return `${memoryState}/secondbrain-queue.md`;
}

function loadOrInit(file: string): string {
  if (!existsSync(file)) {
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    const initial = `${HEADER}_Last updated: ${new Date().toISOString()}_\n\n${PENDING_HEAD}\n${DONE_HEAD}\n`;
    writeFileSync(file, initial, "utf-8");
    return initial;
  }
  return readFileSync(file, "utf-8");
}

function updateTimestamp(content: string): string {
  return content.replace(/_Last updated: [^_]+_/, `_Last updated: ${new Date().toISOString()}_`);
}

function splitSections(content: string): { header: string; pending: string[]; done: string[] } {
  const pendingIdx = content.indexOf(PENDING_HEAD);
  const doneIdx = content.indexOf(DONE_HEAD);
  if (pendingIdx === -1 || doneIdx === -1) {
    return { header: content, pending: [], done: [] };
  }
  const header = content.slice(0, pendingIdx);
  const pendingBlock = content.slice(pendingIdx + PENDING_HEAD.length, doneIdx).trim();
  const doneBlock = content.slice(doneIdx + DONE_HEAD.length).trim();
  const pending = pendingBlock ? pendingBlock.split("\n").filter((l) => l.trim()) : [];
  const done = doneBlock ? doneBlock.split("\n").filter((l) => l.trim()) : [];
  return { header, pending, done };
}

function assemble(header: string, pending: string[], done: string[]): string {
  return `${header}${PENDING_HEAD}\n${pending.join("\n")}\n${pending.length ? "\n" : ""}${DONE_HEAD}\n${done.join("\n")}\n`;
}

/** Trim 'done' items older than 7 days. */
function trimDone(done: string[]): string[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return done.filter((line) => {
    const m = line.match(/\((\d{4}-\d{2}-\d{2}T[\d:Z.+-]+)\)/);
    if (!m) return true; // keep lines without timestamps
    return new Date(m[1]!).getTime() >= cutoff;
  });
}

export async function addToQueue(relpath: string, title?: string): Promise<void> {
  const file = await queueFile();
  const content = updateTimestamp(loadOrInit(file));
  const { header, pending, done } = splitSections(content);
  const line = `- [ ] \`${relpath}\` — ${title ?? relpath} (queued ${new Date().toISOString()})`;
  if (!pending.some((l) => l.includes(`\`${relpath}\``))) pending.push(line);
  writeFileSync(file, assemble(header, pending, trimDone(done)), "utf-8");
}

export async function completeInQueue(relpath: string, target: string): Promise<void> {
  const file = await queueFile();
  const content = updateTimestamp(loadOrInit(file));
  const { header, pending, done } = splitSections(content);
  const remaining = pending.filter((l) => !l.includes(`\`${relpath}\``));
  const completedLine = `- [x] \`${relpath}\` → \`${target}\` (${new Date().toISOString()})`;
  done.unshift(completedLine);
  writeFileSync(file, assemble(header, remaining, trimDone(done)), "utf-8");
}

export async function listQueue(filter?: "pending" | "done"): Promise<{ pending: string[]; done: string[] }> {
  const file = await queueFile();
  const content = loadOrInit(file);
  const { pending, done } = splitSections(content);
  if (filter === "pending") return { pending, done: [] };
  if (filter === "done") return { pending: [], done };
  return { pending, done };
}

if (import.meta.main) {
  const [cmd, relpath, ...rest] = process.argv.slice(2);
  if (cmd === "add" && relpath) {
    const titleIdx = rest.indexOf("--title");
    const title = titleIdx >= 0 ? rest[titleIdx + 1] : undefined;
    await addToQueue(relpath, title);
    console.log(`queued: ${relpath}`);
  } else if (cmd === "complete" && relpath) {
    const targetIdx = rest.indexOf("--target");
    const target = targetIdx >= 0 ? rest[targetIdx + 1] : undefined;
    if (!target) {
      console.error("complete requires --target <relpath>");
      process.exit(1);
    }
    await completeInQueue(relpath, target);
    console.log(`completed: ${relpath} → ${target}`);
  } else if (cmd === "list") {
    const filter = rest.includes("--pending") ? "pending" : rest.includes("--done") ? "done" : undefined;
    const { pending, done } = await listQueue(filter);
    if (!filter || filter === "pending") {
      console.log("Pending:");
      for (const l of pending) console.log(`  ${l}`);
    }
    if (!filter || filter === "done") {
      console.log("Done:");
      for (const l of done) console.log(`  ${l}`);
    }
  } else {
    console.error("usage: bun QueueUpdate.ts <add|complete|list> <relpath> [--title|--target|--pending|--done]");
    process.exit(1);
  }
}
