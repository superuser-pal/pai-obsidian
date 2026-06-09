# Content Lifecycle

Three states, one direction. Every piece of content moves through this pipeline
until it lands in `domains/`.

## State machine

```
        ┌─ /capture ──────────┐
        ├─ /brain-dump ───────┤
URL ───►│                     │
File ──►│   inbox/raw/<n>.md  │ ── /process ──►  inbox/ready/<n>.md  ── /distribute ──►  domains/<T>/02_PAGES/<n>.md
Note ──►│                     │
        ├─ /quick-dump (skip ready, route direct + ripple)
        └─ /save (light pass + ripple)
```

| State | Frontmatter | `status:` | Owner | Gate to next state |
|---|---|---|---|---|
| `raw` | `status: unprocessed`, `tags:` (type optional — Process fills it) | `unprocessed` | User capture commands | `/process` |
| `thinking` | `status: thinking`, `tags:` | `thinking` | `/capture --thinking` | (manual promote/archive) |
| `ready` | Required (type, status, created, source, discovered, tags) | `ready` | `/process` | `/distribute` |
| `domain page` | Required + `distributed:` + `domain:` | `processed` | `/distribute`, `/quick-dump`, `/save` | (user reorganization → archive) |
| `archive` | Required, retained on archive | `archived` | (future) archive workflow | — |

## Frontmatter required at each state

**`inbox/raw/`** — `/capture` writes a minimal block; body is the raw input.

```yaml
---
status: unprocessed
source: <url|file:path|capture|brain-dump>
tags: [capture]   # or [brain-dump, <category>] from /brain-dump
discovered: <local YYYY-MM-DD HH:MM AM/PM>
---
```

**`thinking/`** — `/capture --thinking` writes the same shape with
`status: thinking` and `tags: [thinking, …]`.

**`inbox/ready/`** — `/process` promotes raw → ready:

```yaml
---
type: <People|Companies|Ideas|Research|Note|Daily>
status: ready
created: <local YYYY-MM-DD HH:MM AM/PM>
source: <url|file:path|capture|brain-dump|quick-dump>
discovered: <local YYYY-MM-DD HH:MM AM/PM>
tags: [tag1, tag2]
title: <derived from H1 or filename>
---
```

**`domains/<T>/02_PAGES/`** — `/distribute`, `/quick-dump`, `/save` write or
promote to:

```yaml
status: processed
distributed: <local YYYY-MM-DD HH:MM AM/PM>
domain: <T>
related_pages: [./page-a.md, ./page-b.md]  # optional
```

`/quick-dump` and `/save` skip the inbox dwell — they land directly with
`status: processed`.

## Side effects of each transition

### `raw → ready` (via `/process`)

1. Call `qmd update` to refresh index.
2. Read raw file, derive `title` (H1 or filename), `created` (file mtime).
3. Add full frontmatter; preserve existing fields if present. **Promote
   `status: unprocessed` → `status: ready`** (leave a hand-set `status: thinking`
   alone — those notes don't go through process).
4. Move `inbox/raw/<n>.md` → `inbox/ready/<n>.md`.
5. Run `LintFrontmatter --enforce` on the written file — pipeline halts on
   any `warn` finding.
6. Append `{action: process, source_note, target_note}` to `secondbrain-ingest.jsonl`.
7. Add `<relpath>` to `secondbrain-queue.md` pending list.

### `ready → domain page` (via `/distribute`)

1. Call `qmd update` to refresh index.
2. Snapshot the file to `MEMORY/ARCHIVE/secondbrain-snapshots/<ts>-<slug>.md`.
3. Resolve target domain via `ResolveDomain.ts`.
   - If `unclear`: prompt user, list candidates.
4. Append/promote frontmatter: `distributed:`, `domain:`, **`status: processed`**.
5. Move file to `domains/<T>/02_PAGES/<n>.md`.
6. Run `LintFrontmatter --enforce` on the written file — pipeline halts on
   any `warn` finding.
7. Run `KnowledgeRipple.ts` → upserts a typed entity note in `domains/Knowledge/` for each new `[[Entity]]`.
8. Run cascade preview (find pages with `[[<this-note>]]` references) — show user, do NOT auto-edit.
9. Append `{action: distribute, source_note, target_note}` to jsonl.
10. Mark queue entry as complete.

### `status:` ↔ queue parity

`status:` is the human-readable mirror of `QueueUpdate.ts`'s pending/done.
Both update in lockstep:

| Workflow step | Queue | `status:` |
|---|---|---|
| `/process` raw → ready | `add` (pending) | `unprocessed` → `ready` |
| `/distribute` ready → domain page | `complete` (done) | `ready` → `processed` |
| `/quick-dump` / `/save` (skip inbox) | not enqueued | direct `processed` |

The queue stays the machine-readable source of truth; `status:` is what the
operator sees when they open the note or filter a Base.

## Invariants (preserved from v1)

- **i1** Vault is the single source of truth — the knowledge graph lives in `domains/`, queried via Bases.
- **i2** Frontmatter lint is advisory; no PostToolUse gate.
- **i3** qmd is the default search backbone.
- **i4** Lifecycle is one-directional: raw → ready → domain.
- **i8** `KnowledgeRipple` upserts typed entity notes into the vault (`domains/Knowledge/`), deduped against the whole vault. There is no separate typed graph or queue (Phase 11).
- **i9** Cascade is suggested + previewed, never auto-applied.
- **i10** No hardcoded paths. Tools resolve via `git rev-parse --show-toplevel`.

## Snapshot semantics

`/distribute` ALWAYS snapshots before writing. The snapshot is the
ready-state file copy, before any domain-page-specific frontmatter or path
moves. Restoration is a manual operation: copy the snapshot back to
`inbox/ready/` and re-run `/distribute`.

Snapshots accumulate in `MEMORY/ARCHIVE/secondbrain-snapshots/`. No auto-purge
— intentional. The user trims it manually if it grows.
