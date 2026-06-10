#!/usr/bin/env bun
/**
 * IngestLog.ts — append a SecondBrain lifecycle event to the observability jsonl.
 *
 * Path: `.claude/PAI/MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl` (gitignored).
 *
 * Schema: one JSON object per line, no comments, UTF-8.
 *
 *   { "ts": "ISO-8601", "action": "capture|process|distribute|ripple|...",
 *     "source_note": "<relpath>", "target_note": "<relpath?>",
 *     "entity": "<name?>", "type": "<type?>", "extra": {...?} }
 *
 * Usage:
 *   bun IngestLog.ts --action capture --source-note inbox/raw/foo.md
 *   bun IngestLog.ts --action ripple --entity "Alice Example" --type People --source-note domains/Work/02_PAGES/x.md
 *
 * Or programmatically:
 *   import { logEvent } from "./IngestLog.ts"
 *   await logEvent({ action: "process", source_note: "inbox/raw/foo.md", target_note: "inbox/ready/foo.md" })
 */

import { mkdirSync, appendFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { vaultPaths } from "./ResolveRoot.ts";

export type IngestEvent = {
  action:
    | "capture"
    | "brain-dump"
    | "quick-dump"
    | "save"
    | "process"
    | "distribute"
    | "ingest-url"
    | "ripple"
    | "open-day"
    | "close-day"
    | "create-domain"
    | "harvest"
    | "absorb"
    | "split";
  source_note?: string;
  target_note?: string;
  entity?: string;
  type?: string;
  extra?: Record<string, unknown>;
};

export async function logEvent(e: IngestEvent): Promise<void> {
  const { memoryObservability } = await vaultPaths();
  const file = `${memoryObservability}/secondbrain-ingest.jsonl`;
  if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...e }) + "\n";
  appendFileSync(file, line, "utf-8");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };

  const action = get("--action") as IngestEvent["action"] | undefined;
  if (!action) {
    console.error("usage: bun IngestLog.ts --action <action> [--source-note <p>] [--target-note <p>] [--entity <name>] [--type <t>]");
    process.exit(1);
  }

  await logEvent({
    action,
    source_note: get("--source-note"),
    target_note: get("--target-note"),
    entity: get("--entity"),
    type: get("--type"),
  });
  console.log(`logged: ${action}`);
}
