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

| State | Frontmatter | Owner | Gate to next state |
|---|---|---|---|
| `raw` | Optional | User capture commands | `/process` |
| `ready` | Required (type, created, source, discovered, tags) | `/process` | `/distribute` |
| `domain page` | Required + distributed flag | `/distribute` | (user reorganization) |

## Frontmatter required at each state

**`inbox/raw/`** — no requirements. A raw file can be a single line of text.

**`inbox/ready/`** — `/process` adds:

```yaml
---
type: <People|Companies|Ideas|Research|Note|Daily>
created: <ISO-8601>
source: <url|file:path|capture|brain-dump|quick-dump>
discovered: <ISO-8601>
tags: [tag1, tag2]
title: <derived from H1 or filename>
---
```

**`domains/<T>/02_PAGES/`** — `/distribute` appends:

```yaml
distributed: <ISO-8601>
domain: <T>
related_pages: [./page-a.md, ./page-b.md]  # optional
```

## Side effects of each transition

### `raw → ready` (via `/process`)

1. Call `qmd update` to refresh index.
2. Read raw file, derive `title` (H1 or filename), `created` (file mtime).
3. Add full frontmatter; preserve existing fields if present.
4. Move `inbox/raw/<n>.md` → `inbox/ready/<n>.md`.
5. Append `{action: process, source_note, target_note}` to `secondbrain-ingest.jsonl`.
6. Add `<relpath>` to `secondbrain-queue.md` pending list.

### `ready → domain page` (via `/distribute`)

1. Call `qmd update` to refresh index.
2. Snapshot the file to `MEMORY/ARCHIVE/secondbrain-snapshots/<ts>-<slug>.md`.
3. Resolve target domain via `ResolveDomain.ts`.
   - If `unclear`: prompt user, list candidates.
4. Move file to `domains/<T>/02_PAGES/<n>.md`.
5. Run `KnowledgeRipple.ts` → emits harvest-queue stubs for each `[[Entity]]`.
6. Run cascade preview (find pages with `[[<this-note>]]` references) — show user, do NOT auto-edit.
7. Append `{action: distribute, source_note, target_note}` to jsonl.
8. Mark queue entry as complete.

## Invariants (preserved from v1)

- **i1** Vault is the UI, MEMORY is the system of record.
- **i2** Frontmatter lint is advisory; no PostToolUse gate.
- **i3** qmd is the default search backbone.
- **i4** Lifecycle is one-directional: raw → ready → domain.
- **i8** `KnowledgeRipple` NEVER writes to `KNOWLEDGE/<Type>/`. It only seeds `_harvest-queue/`.
- **i9** Cascade is suggested + previewed, never auto-applied.
- **i10** No hardcoded paths. Tools resolve via `git rev-parse --show-toplevel`.

## Snapshot semantics

`/distribute` ALWAYS snapshots before writing. The snapshot is the
ready-state file copy, before any domain-page-specific frontmatter or path
moves. Restoration is a manual operation: copy the snapshot back to
`inbox/ready/` and re-run `/distribute`.

Snapshots accumulate in `MEMORY/ARCHIVE/secondbrain-snapshots/`. No auto-purge
— intentional. The user trims it manually if it grows.
