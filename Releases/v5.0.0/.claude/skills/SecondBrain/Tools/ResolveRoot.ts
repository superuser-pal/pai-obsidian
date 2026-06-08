#!/usr/bin/env bun
/**
 * ResolveRoot.ts — resolve the two anchors SecondBrain writes against.
 *
 * pai-obsidian splits what upstream PAI fused. Upstream assumed repo == vault:
 * one git root held both the Obsidian content folders AND `.claude/`. This fork
 * installs `.claude/` GLOBALLY into `~/.claude`, so the vault and the runtime
 * live in different directories. Two anchors:
 *
 *   - VAULT root — where Obsidian content folders live (inbox/, plan/, thinking/,
 *     domains/, bases/). From `$VAULT_DIR` (or `$OBSIDIAN_VAULT`), falling back to
 *     `git rev-parse --show-toplevel` for repo==vault setups.
 *   - PAI dir — where PAI runtime state lives (`PAI/MEMORY/…`). From `$PAI_DIR`,
 *     falling back to `$HOME/.claude`.
 *
 * The split is safe because no consumer mixes the two: vault-content paths derive
 * from the vault root; the five `memory*` paths derive from the PAI dir. Every
 * other SecondBrain tool imports `vaultPaths()` and reads named fields only.
 * No tool hardcodes a `/Users/…` path.
 *
 * Usage:
 *   bun ResolveRoot.ts            # prints the vault root
 *   bun ResolveRoot.ts --pai-dir  # prints the PAI runtime dir
 *   import { resolveRoot, resolvePaiDir, vaultPaths } from "./ResolveRoot.ts"
 */

import { $ } from "bun";
import { homedir } from "node:os";

/** Strip trailing slashes so path joins never double up. */
function clean(p: string): string {
  return p.trim().replace(/\/+$/, "");
}

/** The vault root — where Obsidian content folders live. */
export async function resolveRoot(): Promise<string> {
  const envVault = process.env.VAULT_DIR ?? process.env.OBSIDIAN_VAULT;
  if (envVault && envVault.trim()) return clean(envVault);

  const result = await $`git rev-parse --show-toplevel`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(
      `ResolveRoot: cannot locate the vault. Set $VAULT_DIR to your Obsidian ` +
        `vault path, or run from inside a git repo that IS the vault ` +
        `(cwd=${process.cwd()}).`
    );
  }
  return clean(result.stdout.toString());
}

/** The PAI runtime dir — where `PAI/MEMORY/…` state lives. Defaults to ~/.claude. */
export function resolvePaiDir(): string {
  const envPai = process.env.PAI_DIR;
  if (envPai && envPai.trim()) return clean(envPai);
  return `${homedir()}/.claude`;
}

/**
 * Absolute paths SecondBrain writes against.
 *
 * Vault-content fields (`root`, `inboxRaw`…`bases`) derive from the VAULT root.
 * Runtime fields (`memory*`) derive from the PAI dir. Field names and shapes are
 * identical to upstream — only the `memory*` derivation moved from `${root}/.claude`
 * to `${paiDir}`, so existing consumers need no changes.
 */
export async function vaultPaths(): Promise<{
  root: string;
  inboxRaw: string;
  inboxReady: string;
  thinking: string;
  plan: string;
  domains: string;
  bases: string;
  memoryState: string;
  memoryObservability: string;
  memoryArchive: string;
  memoryLearningReflections: string;
  memoryHarvestQueue: string;
}> {
  const root = await resolveRoot();
  const pai = resolvePaiDir();
  return {
    root,
    inboxRaw: `${root}/inbox/raw`,
    inboxReady: `${root}/inbox/ready`,
    thinking: `${root}/thinking`,
    plan: `${root}/plan`,
    domains: `${root}/domains`,
    bases: `${root}/bases`,
    memoryState: `${pai}/PAI/MEMORY/STATE`,
    memoryObservability: `${pai}/PAI/MEMORY/OBSERVABILITY`,
    memoryArchive: `${pai}/PAI/MEMORY/ARCHIVE/secondbrain-snapshots`,
    memoryLearningReflections: `${pai}/PAI/MEMORY/LEARNING/REFLECTIONS`,
    memoryHarvestQueue: `${pai}/PAI/MEMORY/KNOWLEDGE/_harvest-queue`,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--pai-dir")) {
    console.log(resolvePaiDir());
  } else {
    console.log(await resolveRoot());
  }
}
