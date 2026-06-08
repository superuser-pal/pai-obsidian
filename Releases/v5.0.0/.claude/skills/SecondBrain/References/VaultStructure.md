# Vault Structure

Two anchors (pai-obsidian split):

- **`$VAULT_DIR`** — the Obsidian vault, where content folders and `.obsidian/` live.
  Falls back to `git rev-parse --show-toplevel` when you run from inside a repo that is
  the vault (the upstream repo==vault layout still works).
- **`$PAI_DIR`** — the global PAI install (`~/.claude` by default), where runtime
  `PAI/MEMORY/` state lives. Separate from the vault.

[../Tools/ResolveRoot.ts](../Tools/ResolveRoot.ts) resolves both; the `memory*` paths
derive from `$PAI_DIR`, every vault-content path from `$VAULT_DIR`.

## Folder model

All paths below are relative to `$VAULT_DIR`.

| Path | Tracked? | Owner | Purpose |
|---|---|---|---|
| `inbox/raw/` | ❌ ignored | `/capture`, `/brain-dump`, `/quick-dump` | Unprocessed input — anything goes |
| `inbox/ready/` | ❌ ignored | `/process` | Frontmatter-shaped, awaiting distribution |
| `thinking/` | ❌ ignored | `/capture --thinking`, user | Private drafts, never auto-routed |
| `plan/` | ✅ tracked | `/open-day`, user | Daily plans, one file per day |
| `domains/` | ✅ tracked | `/distribute`, `/create-domain`, user | Topical knowledge — one folder per topic |
| `bases/` | ✅ tracked | user (in Obsidian) | Obsidian Bases dashboards |
| `.obsidian/app.json` | ✅ tracked | install | Vault-wide config |
| `.obsidian/community-plugins.json` | ✅ tracked | install + user | Plugin enable list |
| `.obsidian/workspace*.json` | ❌ ignored | Obsidian runtime | Per-machine UI state |
| `.obsidian/plugins/` | ❌ ignored | Obsidian | Plugin binaries (reinstall per machine) |

The tracked/ignored split is enforced by the per-folder `.gitignore` files the Phase 4
vault scaffold ships — `domains/` and `plan/` are committed; `inbox/` and `thinking/`
are local-only.

## Domain folder shape

Every `domains/<Name>/` follows the same skeleton, created by `/create-domain`:

```
domains/Work/
├── INDEX.md          # Overview, wikilinked map of the domain
├── 01_PROJECTS/      # Active multi-page efforts
├── 02_PAGES/         # The default landing zone for distributed notes
└── 03_ARCHIVE/       # Stale or completed content
```

`/distribute` always lands in `02_PAGES/`. Moves to `01_PROJECTS/` or `03_ARCHIVE/` are
manual (user reorganization in Obsidian).

## PAI-managed paths

Under `$PAI_DIR/PAI/MEMORY/` (NOT the vault), this skill writes to five paths:

| Path | Written by | Format |
|---|---|---|
| `MEMORY/STATE/secondbrain-queue.md` | `QueueUpdate.ts` | Human-readable markdown |
| `MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl` | `IngestLog.ts` | One JSON object per line |
| `MEMORY/ARCHIVE/secondbrain-snapshots/<ts>-<slug>.md` | `/distribute` (pre-write snapshot) | Full pre-distribute file copy |
| `MEMORY/LEARNING/REFLECTIONS/secondbrain-close-day.jsonl` | `/close-day` | One JSON object per session |
| `MEMORY/KNOWLEDGE/_harvest-queue/<slug>.md` | `KnowledgeRipple.ts` | Frontmatter-only stubs |

These are PAI's runtime — never user-edited. The harvest queue is consumed by PAI's
existing `KnowledgeHarvester.ts` (`$PAI_DIR/PAI/TOOLS/`) into the typed
`MEMORY/KNOWLEDGE/{People,Companies,Ideas,Research}/` graph. The writer tools create
their parent directories on first write, so a fresh install needs no manual scaffolding.

## Why two anchors (vs upstream repo==vault)

Upstream PAI assumes the PAI repo IS the vault: one git root holds both the content
folders and `.claude/`. pai-obsidian installs `.claude/` globally into `~/.claude`, so
the vault and the runtime are separated:

- Vault content → `$VAULT_DIR` (your Obsidian vault, wherever it lives)
- Runtime state → `$PAI_DIR` (`~/.claude`, shared with the rest of PAI)

This keeps the harvest pipeline shared with the global PAI install while letting your
notes vault live anywhere. Repo==vault users lose nothing: leave `$VAULT_DIR` unset and
the git-root fallback reproduces the upstream layout.
