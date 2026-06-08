#!/usr/bin/env bun
/**
 * QmdUpdate.ts — re-index qmd collections for the SecondBrain vault.
 *
 * Called by `/process`, `/distribute`, `/save` before their first qmd query
 * (plan §7: workflows trigger qmd update; no PostToolUse hook by default — §8).
 *
 * The shipped `.claude/settings.json` template (§8) can route PostToolUse
 * Write|Edit through this script — when that opt-in hook is enabled, the
 * --hook-stdin mode below reads the tool_input.file_path from stdin and
 * short-circuits unless it's a vault-content write. Microsecond overhead for
 * non-vault edits.
 *
 * Usage:
 *   bun QmdUpdate.ts                  # qmd update (all collections)
 *   bun QmdUpdate.ts --hook-stdin     # PostToolUse hook mode (reads JSON on stdin)
 */

import { $ } from "bun";
import { resolveRoot } from "./ResolveRoot.ts";

const VAULT_CONTENT_PREFIXES = ["inbox", "plan", "thinking", "domains", "bases"];

async function isVaultWrite(filePath: string | undefined): Promise<boolean> {
  if (!filePath) return false;
  const root = await resolveRoot();
  if (!filePath.startsWith(root)) return false;
  const rel = filePath.slice(root.length + 1);
  return VAULT_CONTENT_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`));
}

async function runQmdUpdate(): Promise<number> {
  const result = await $`qmd update`.quiet().nothrow();
  if (result.exitCode !== 0) {
    console.error(`qmd update failed (exit ${result.exitCode}):\n${result.stderr.toString()}`);
  }
  return result.exitCode;
}

if (import.meta.main) {
  if (process.argv.includes("--hook-stdin")) {
    // PostToolUse hook mode: read the tool call JSON on stdin, decide whether
    // the write is inside vault content. If yes → run qmd update. Otherwise
    // early-exit with code 0 (don't block the parent tool call).
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    try {
      const payload = JSON.parse(input);
      const fp = payload?.tool_input?.file_path;
      if (await isVaultWrite(fp)) {
        const code = await runQmdUpdate();
        process.exit(code);
      }
      process.exit(0); // non-vault write, no-op
    } catch {
      // Malformed stdin — non-blocking, exit 0 so the parent hook keeps working.
      process.exit(0);
    }
  } else {
    const code = await runQmdUpdate();
    process.exit(code);
  }
}
