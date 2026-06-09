---
name: SecondBrain
description: "Capture → process → distribute lifecycle for a personal Obsidian knowledge vault (content under $VAULT_DIR; PAI runtime under $PAI_DIR). Manages inbox/raw → inbox/ready → domains/<Topic>/02_PAGES routing for arbitrary content (URLs, files, freeform thoughts, brain dumps, quick captures). Surfaces entities ([[People]], [[Companies]], [[Ideas]], [[Research]]) and upserts them as typed notes (type: person|company|idea|research) directly into the vault at domains/Knowledge/, queryable via bases/Knowledge.base. (Phase 11: the vault is the single source of truth — there is no separate MEMORY/KNOWLEDGE graph or harvest queue.) Owns ten workflows: Capture (drop into inbox/raw), BrainDump (atomic observation extraction with [category] syntax), QuickDump (classify + route + entity upsert), Save (light edit + classify + dedup + wikilinks), Process (raw → ready with full frontmatter, qmd-update first), Distribute (ready → domains/<Name>/02_PAGES/ + snapshot + entity upsert + cascade preview), IngestUrl (defuddle → process → distribute chain), OpenDay (TELOS + today's plan + open inbox), CloseDay (surface typed entities + reflection summary to MEMORY/LEARNING/REFLECTIONS/), CreateDomain (scaffold domains/<Name>/{INDEX,01_PROJECTS,02_PAGES,03_ARCHIVE}). Plus Harvest (qmd reindex + knowledge health). Vault content folders (inbox/, plan/, thinking/, domains/, bases/) live under $VAULT_DIR; PAI runtime state (ingest log, snapshots, reflections) lives under $PAI_DIR (~/.claude), never the vault. USE WHEN capture, save, brain dump, quick dump, process inbox, distribute, ingest url, open day, close day, create domain, harvest, second brain, vault, daily plan, drop this in inbox, knowledge ripple, where does this belong. NOT FOR bulk vault export ingestion from external tools (use Migrate). NOT FOR managing the typed entity graph directly (use Knowledge)."
---

# SecondBrain — capture → process → distribute lifecycle on PAI

This skill turns an Obsidian vault into a personal knowledge system. Drop a thought into
`inbox/raw/`, run `/process`, run `/distribute`, and the page lands in the right
topical domain — while `[[entities]]` are upserted as typed notes in the vault
(`domains/Knowledge/`), queryable via `bases/Knowledge.base`.

**Two anchors (pai-obsidian split):** the vault and PAI's runtime live in different
places. Vault content folders — `inbox/`, `plan/`, `thinking/`, `domains/`, `bases/` —
live under `$VAULT_DIR` (your Obsidian vault; falls back to the git root if you run from
inside a repo that is the vault). PAI's runtime state lives under `$PAI_DIR` (`~/.claude`
by default). [Tools/ResolveRoot.ts](Tools/ResolveRoot.ts) resolves both; no tool mixes
them. Set `$VAULT_DIR` before using this skill.

## Paradigm — three states, one direction

```
        ┌──────────────┐    /process     ┌────────────────┐    /distribute   ┌──────────────────────────┐
inbox →  inbox/raw/<n> │ ────────────▶  │ inbox/ready/<n> │ ────────────▶   │ domains/<Topic>/02_PAGES │
        └──────────────┘                 └────────────────┘                  └──────────────────────────┘
              ▲                                                                          │
              │ /capture                                                                 │
              │ /brain-dump                                                              ▼
              │ /quick-dump                                    $PAI_DIR: MEMORY/ARCHIVE/secondbrain-snapshots/
              │ /save                                                    MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl
              │                                               $VAULT_DIR: domains/Knowledge/<entity>.md (typed notes)
              │
        any source (URL, file, voice, freeform thought)
```

Three rules govern routing:

1. **raw** is unprocessed input — anything goes, no frontmatter required.
2. **ready** is fully-shaped content with frontmatter, ready to live somewhere durable.
3. **domains/** is the durable home — one folder per topic, organized by user.

## When to use which command

| Situation | Command | What it does |
|---|---|---|
| "I just had a thought" | `/capture` | Plain text → `inbox/raw/<slug>.md` (or `thinking/` with `--thinking`) |
| "Here's a stream of observations" | `/brain-dump` | Splits into atomic notes by `[category]` syntax → `inbox/raw/` |
| "Save this and figure out where it belongs" | `/quick-dump` | Classify + route directly + ripple entities |
| "Save this URL/file with a light pass" | `/save` | Edit + classify + dedup + wikilink + ripple |
| "Promote everything in inbox/raw to ready" | `/process` | Adds full frontmatter, runs `qmd update` first |
| "Route everything in inbox/ready to domains" | `/distribute` | Move + snapshot + ripple + preview cascade |
| "Ingest a URL end-to-end" | `/ingest-url <url>` | defuddle → process → distribute in one chain |
| Morning ritual | `/open-day` | Load TELOS, today's plan, open inbox |
| Evening ritual | `/close-day` | Reconcile + reflection summary to MEMORY/LEARNING/REFLECTIONS/ |
| New topical area | `/create-domain <Name>` | Scaffold `domains/<Name>/{INDEX,01_PROJECTS,02_PAGES,03_ARCHIVE}` |

See [References/CommandReference.md](References/CommandReference.md) for full per-command behavior.

## What this skill does NOT do

- **Creates entity notes in the vault, not a separate graph.** Detected `[[entities]]`
  are upserted as typed notes (`type: person|company|idea|research`) in
  `domains/Knowledge/`, deduped against the whole vault. There is no `MEMORY/KNOWLEDGE`
  typed graph or harvest queue anymore (Phase 11: vault as single source of truth).
- **Does not auto-edit related pages on distribute.** The cascade is *suggested + previewed*;
  the user confirms each related-page edit (plan §13 R7, preserved from v1 R7).
- **Does not migrate existing content from another vault.** Use PAI's `Migrate` skill against
  a checkout of `my-second-brain` (or any other Obsidian export) when you want to pull pages.
- **Does not modify any global PAI file.** Only this repo's `.claude/CLAUDE.md` gets one
  appended section (Phase 5 of the migration plan).

## Key paths

All runtime paths are under `$PAI_DIR` (`~/.claude` by default), NOT the vault:

| Purpose | Path |
|---|---|
| Pending-distribution queue | `$PAI_DIR/PAI/MEMORY/STATE/secondbrain-queue.md` |
| Lifecycle event log | `$PAI_DIR/PAI/MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl` |
| Pre-distribute snapshots | `$PAI_DIR/PAI/MEMORY/ARCHIVE/secondbrain-snapshots/` |
| Daily reflections | `$PAI_DIR/PAI/MEMORY/LEARNING/REFLECTIONS/secondbrain-close-day.jsonl` |
| Typed entity notes (in the VAULT) | `$VAULT_DIR/domains/Knowledge/<slug>.md` |

The first four are PAI-managed runtime state — never user-edited, and they live in the
global PAI install, not in your notes vault. The entity notes are the exception: they
are real vault content (the knowledge graph) under `$VAULT_DIR`. The tools that write
these paths (`QueueUpdate`, `IngestLog`, `KnowledgeRipple`) create their parent dirs on
first write.

## Frontmatter contract

Every note that lands in `inbox/ready/` or `domains/.../02_PAGES/` has at minimum:

```yaml
---
type: <People|Companies|Ideas|Research|Note|Daily>
status: <unprocessed|thinking|ready|processed|archived>
created: 2026-05-19 02:32 PM
source: <url|file:path|capture|brain-dump>
discovered: 2026-05-19 02:32 PM
tags: [tag1, tag2]
---
```

Notes in `inbox/raw/` and `thinking/` carry `status:` (and `tags:`) but may
omit `type:` until `/process` classifies them.

**Timestamp rule:** `created` and `discovered` use local time formatted as `date +"%Y-%m-%d %I:%M %p"` (e.g. `2026-05-20 08:23 PM`). Never ISO 8601, never UTC Z suffix.

`type` drives the [[Entity]] classification in [Tools/ResolveDomain.ts](Tools/ResolveDomain.ts)
and [Tools/KnowledgeRipple.ts](Tools/KnowledgeRipple.ts).

### `status:` — lifecycle enum

Five canonical values; each workflow sets the right one as the note moves:

| Stage | Folder | `status:` value | Set by |
|---|---|---|---|
| Captured, unshaped | `inbox/raw/` | `unprocessed` | `/capture`, `/brain-dump` |
| Captured, reasoning | `thinking/` | `thinking` | `/capture --thinking` |
| Shaped, awaiting filing | `inbox/ready/` | `ready` | `/process` |
| Filed to a domain | `domains/<T>/02_PAGES/` | `processed` | `/distribute`, `/quick-dump`, `/save` |
| Entity note | `domains/Knowledge/` | `processed` | `KnowledgeRipple` |
| Retired | `domains/<T>/03_ARCHIVE/` | `archived` | archive workflow |

`status:` is the human-readable mirror of the queue state in
[Tools/QueueUpdate.ts](Tools/QueueUpdate.ts) (`pending`/`done`); the queue stays
the machine-readable source of truth. Both update in lockstep during
`/process` and `/distribute`.

### Lint policy — advisory by default, enforced in the pipeline

[Tools/LintFrontmatter.ts](../Qmd/Tools/LintFrontmatter.ts) checks these fields.
By default it is advisory (warnings to stderr, exit 0) — preserves invariant i2,
no PostToolUse gate, hand-edits in Obsidian never get blocked.

Every SecondBrain workflow that CREATES or MOVES a file invokes the linter with
`--enforce` after the write. In enforce mode any `warn`-severity finding
(missing/invalid `status:`, missing `type:` outside `inbox/raw/`, bad timestamp,
unbalanced wikilinks, etc.) causes a non-zero exit, halting the pipeline before
a bad-state note ships. `info` findings (e.g. missing `source:` on an inbox
note) stay non-blocking.

## Tools

| Tool | Purpose |
|---|---|
| [Tools/ResolveRoot.ts](Tools/ResolveRoot.ts) | `git rev-parse --show-toplevel` helper used by every other tool |
| [Tools/ResolveDomain.ts](Tools/ResolveDomain.ts) | Classify a note (path + frontmatter + content heuristics) → target `domains/<Name>` |
| [Tools/KnowledgeRipple.ts](Tools/KnowledgeRipple.ts) | Extract `[[Entity]]` wikilinks → upsert typed entity notes into `domains/Knowledge/` |
| [Tools/QueueUpdate.ts](Tools/QueueUpdate.ts) | Append/update the pending-distribution queue at `MEMORY/STATE/secondbrain-queue.md` |
| [Tools/IngestLog.ts](Tools/IngestLog.ts) | Append a lifecycle event to `MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl` |
| [Tools/QmdUpdate.ts](Tools/QmdUpdate.ts) | Re-index vault collections; called by workflows before first search |

## Workflows

| Workflow | File |
|---|---|
| Capture | [Workflows/Capture.md](Workflows/Capture.md) |
| BrainDump | [Workflows/BrainDump.md](Workflows/BrainDump.md) |
| QuickDump | [Workflows/QuickDump.md](Workflows/QuickDump.md) |
| Save | [Workflows/Save.md](Workflows/Save.md) |
| Process | [Workflows/Process.md](Workflows/Process.md) |
| Distribute | [Workflows/Distribute.md](Workflows/Distribute.md) |
| IngestUrl | [Workflows/IngestUrl.md](Workflows/IngestUrl.md) |
| OpenDay | [Workflows/OpenDay.md](Workflows/OpenDay.md) |
| CloseDay | [Workflows/CloseDay.md](Workflows/CloseDay.md) |
| CreateDomain | [Workflows/CreateDomain.md](Workflows/CreateDomain.md) |
| Harvest | [Workflows/Harvest.md](Workflows/Harvest.md) |

## References

| File | Topic |
|---|---|
| [References/VaultStructure.md](References/VaultStructure.md) | Folder model — what goes where, tracked vs ignored |
| [References/ContentLifecycle.md](References/ContentLifecycle.md) | raw → ready → page state machine + invariants |
| [References/AssetClasses.md](References/AssetClasses.md) | Note types (People, Companies, Ideas, Research, Note, Daily) and their frontmatter |
| [References/CommandReference.md](References/CommandReference.md) | Full per-command behavior |

## Relationship to other PAI skills

- **`Migrate`** — bulk export ingestion from external vaults (Notion, Apple Notes, other PAI installs). SecondBrain owns continuous single-capture; `Migrate` owns one-shot import. Plan §13 R1.
- **`Knowledge`** — search/develop/contradiction-check over the typed entity notes in the vault (`domains/Knowledge/`, queried via `bases/Knowledge.base`). SecondBrain creates those notes during capture/distribute; `Knowledge` curates and queries them. Same vault, no separate graph.
- **`Qmd`** — semantic vault search. SecondBrain workflows call `qmd update` before searches and `qmd query` for duplicate checks.
- **`ObsidianMarkdown` / `ObsidianCLI` / `ObsidianBases`** — vault authoring primitives. SecondBrain composes these for higher-order operations.
