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
 *   - PAI dir — where PAI runtime state lives (`MEMORY/…`). From `$PAI_DIR` (the
 *     framework value `~/.claude/PAI`), falling back to `$HOME/.claude/PAI`. Skills
 *     live one level up at `~/.claude/skills`, so they are NOT under `$PAI_DIR`.
 *
 * The split is safe because no consumer mixes the two: vault-content paths
 * (including `knowledgeHome`, where typed entity notes live as of Phase 11)
 * derive from the vault root; the `memory*` runtime paths derive from the PAI
 * dir. Every other SecondBrain tool imports `vaultPaths()` and reads named
 * fields only. No tool hardcodes a `/Users/…` path.
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

/**
 * The PAI runtime root — where `MEMORY/…` state lives. This is the framework's
 * `$PAI_DIR`, which settings.json sets to `~/.claude/PAI`; we honor that value and
 * default to `~/.claude/PAI` when it's unset. NOTE: skills live one level UP at
 * `~/.claude/skills` (siblings of `PAI/`), so they are NOT under `$PAI_DIR` —
 * workflow docs reference tools via `$HOME/.claude/skills/…`, never `$PAI_DIR/skills`.
 */
export function resolvePaiDir(): string {
  const envPai = process.env.PAI_DIR;
  if (envPai && envPai.trim()) return clean(envPai);
  return `${homedir()}/.claude/PAI`;
}

/**
 * Absolute paths SecondBrain writes against.
 *
 * Vault-content fields (`root`, `inboxRaw`…`bases`, `knowledgeHome`) derive from
 * the VAULT root. Runtime fields (`memory*`) derive from the PAI dir. Phase 11
 * dropped `memoryHarvestQueue` and added vault-derived `knowledgeHome`, so typed
 * entities now live in the vault (the single source of truth), not PAI runtime.
 */
export async function vaultPaths(): Promise<{
  root: string;
  inboxRaw: string;
  inboxReady: string;
  thinking: string;
  plan: string;
  domains: string;
  bases: string;
  knowledgeHome: string;
  memoryState: string;
  memoryObservability: string;
  memoryArchive: string;
  memoryLearningReflections: string;
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
    // Phase 11 — vault as single source of truth. Typed entity notes
    // (type: person|company|idea|research) land here, in the VAULT, and are
    // queried via bases/Knowledge.base. This replaces the old harvest-queue
    // handoff to PAI/MEMORY/KNOWLEDGE (which the harvester never even consumed,
    // since the ripple wrote .md and the harvester only read .json).
    knowledgeHome: `${root}/domains/Knowledge`,
    memoryState: `${pai}/MEMORY/STATE`,
    memoryObservability: `${pai}/MEMORY/OBSERVABILITY`,
    memoryArchive: `${pai}/MEMORY/ARCHIVE/secondbrain-snapshots`,
    memoryLearningReflections: `${pai}/MEMORY/LEARNING/REFLECTIONS`,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--pai-dir")) {
    console.log(resolvePaiDir());
  } else {
    console.log(await resolveRoot());
  }
}
