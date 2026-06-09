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

| Path | Owner | Purpose |
|---|---|---|
| `inbox/raw/` | `/capture`, `/brain-dump`, `/quick-dump` | Unprocessed input — anything goes |
| `inbox/ready/` | `/process` | Frontmatter-shaped, awaiting distribution |
| `thinking/` | `/capture --thinking`, user | Private drafts, never auto-routed |
| `plan/` | `/open-day`, user | Daily plans, one file per day |
| `domains/` | `/distribute`, `/create-domain`, user | Topical knowledge — one folder per topic |
| `bases/` | user (in Obsidian) | Obsidian Bases dashboards |
| `dashboards/` | `ProjectManagement`, user | MOC hubs, `TASKS.md`, daily/weekly dashboards |

**Git tracking:** the Phase 4 vault scaffold ships every content folder with a
blanket-ignore `.gitignore` (`*` / `!.gitkeep` / `!.gitignore`) — nothing you write
into the vault is committed by default, so personal notes never leak into the public
fork. If you want to version a folder's content in your own private fork, relax that
folder's `.gitignore` (e.g. allow `*.md`). `.obsidian/workspace*.json` and
`.obsidian/plugins/` should stay ignored (per-machine state); `app.json` and
`community-plugins.json` are safe to track if you choose to.

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

The four above are PAI runtime under `$PAI_DIR` — never user-edited. Separately,
`KnowledgeRipple.ts` writes typed entity notes to `$VAULT_DIR/domains/Knowledge/<slug>.md`
— that is real vault content (the knowledge graph), queried via `bases/Knowledge.base`.
The writer tools create their parent directories on first write, so a fresh install
needs no manual scaffolding.

## Why two anchors (vs upstream repo==vault)

Upstream PAI assumes the PAI repo IS the vault: one git root holds both the content
folders and `.claude/`. pai-obsidian installs `.claude/` globally into `~/.claude`, so
the vault and the runtime are separated:

- Vault content → `$VAULT_DIR` (your Obsidian vault, wherever it lives)
- Runtime state → `$PAI_DIR` (`~/.claude`, shared with the rest of PAI)

This keeps the harvest pipeline shared with the global PAI install while letting your
notes vault live anywhere. Repo==vault users lose nothing: leave `$VAULT_DIR` unset and
the git-root fallback reproduces the upstream layout.
