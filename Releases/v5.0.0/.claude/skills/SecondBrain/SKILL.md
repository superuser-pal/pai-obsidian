---
name: SecondBrain
description: "Capture → process → distribute lifecycle for a personal knowledge vault rooted at this PAI repo. Manages inbox/raw → inbox/ready → domains/<Topic>/02_PAGES routing for arbitrary content (URLs, files, freeform thoughts, brain dumps, quick captures). Surfaces entities ([[People]], [[Companies]], [[Ideas]], [[Research]]) and ripples them into PAI's MEMORY/KNOWLEDGE/_harvest-queue/ for the existing KnowledgeHarvester pipeline to consume. Owns ten workflows: Capture (drop into inbox/raw), BrainDump (atomic observation extraction with [category] syntax), QuickDump (classify + route + ripple), Save (light edit + classify + dedup + wikilinks), Process (raw → ready with full frontmatter, qmd-update first), Distribute (ready → domains/<Name>/02_PAGES/ + snapshot + ripple + cascade preview), IngestUrl (defuddle → process → distribute chain), OpenDay (TELOS + today's plan + open inbox), CloseDay (route typed entities + reflection summary to MEMORY/LEARNING/REFLECTIONS/), CreateDomain (scaffold domains/<Name>/{INDEX,01_PROJECTS,02_PAGES,03_ARCHIVE}). Plus Harvest (full reindex). Vault content folders (inbox/, plan/, thinking/, domains/, bases/) live at PAI repo root; .obsidian/ sibling to .claude/. PAI's MEMORY/KNOWLEDGE/ remains authoritative for typed AI data; this skill never writes there directly — only stubs into _harvest-queue/. USE WHEN capture, save, brain dump, quick dump, process inbox, distribute, ingest url, open day, close day, create domain, harvest, second brain, vault, daily plan, drop this in inbox, knowledge ripple, where does this belong. NOT FOR bulk vault export ingestion from external tools (use Migrate). NOT FOR Knowledge Archive direct edits (use Knowledge)."
---

# SecondBrain — capture → process → distribute lifecycle on PAI

This skill turns an Obsidian vault into a personal knowledge system. Drop a thought into
`inbox/raw/`, run `/process`, run `/distribute`, and the page lands in the right
topical domain — while entities ripple into PAI's typed knowledge graph through
the existing harvest pipeline.

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
              │ /quick-dump                                                  MEMORY/ARCHIVE/secondbrain-snapshots/
              │ /save                                                        MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl
              │                                                              MEMORY/KNOWLEDGE/_harvest-queue/<entity>.md
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

- **Does not write to `MEMORY/KNOWLEDGE/{People,Companies,Ideas,Research}/` directly.**
  Detected entities become stubs in `MEMORY/KNOWLEDGE/_harvest-queue/`; PAI's existing
  `KnowledgeHarvester.ts` consumes those stubs into the typed graph. Preserves v1 invariant i8.
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
| Entity harvest stubs (transient) | `$PAI_DIR/PAI/MEMORY/KNOWLEDGE/_harvest-queue/<slug>.md` |

All five are PAI-managed runtime state — never user-edited, and they live in the
global PAI install, not in your notes vault. The tools that write them
(`QueueUpdate`, `IngestLog`, `KnowledgeRipple`) create their parent dirs on first write.

## Frontmatter contract

Every note that lands in `inbox/ready/` or `domains/.../02_PAGES/` has at minimum:

```yaml
---
type: <People|Companies|Ideas|Research|Note|Daily>
created: 2026-05-19 02:32 PM
source: <url|file:path|capture|brain-dump>
discovered: 2026-05-19 02:32 PM
tags: [tag1, tag2]
---
```

**Timestamp rule:** `created` and `discovered` use local time formatted as `date +"%Y-%m-%d %I:%M %p"` (e.g. `2026-05-20 08:23 PM`). Never ISO 8601, never UTC Z suffix.

`type` drives the [[Entity]] classification in [Tools/ResolveDomain.ts](Tools/ResolveDomain.ts)
and [Tools/KnowledgeRipple.ts](Tools/KnowledgeRipple.ts). [Tools/LintFrontmatter.ts](../Qmd/Tools/LintFrontmatter.ts)
checks these advisory (never blocking) — see plan §13 R2.

## Tools

| Tool | Purpose |
|---|---|
| [Tools/ResolveRoot.ts](Tools/ResolveRoot.ts) | `git rev-parse --show-toplevel` helper used by every other tool |
| [Tools/ResolveDomain.ts](Tools/ResolveDomain.ts) | Classify a note (path + frontmatter + content heuristics) → target `domains/<Name>` |
| [Tools/KnowledgeRipple.ts](Tools/KnowledgeRipple.ts) | Extract `[[Entity]]` wikilinks → emit harvest-queue stubs (plan §12) |
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
- **`Knowledge`** — direct CRUD on `MEMORY/KNOWLEDGE/` typed entities. SecondBrain only emits harvest-queue stubs; `Knowledge` (or `KnowledgeHarvester.ts` automation) does the typed-graph writes.
- **`Qmd`** — semantic vault search. SecondBrain workflows call `qmd update` before searches and `qmd query` for duplicate checks.
- **`ObsidianMarkdown` / `ObsidianCLI` / `ObsidianBases`** — vault authoring primitives. SecondBrain composes these for higher-order operations.
