# WeekClose — weekly closing workflow

Invoked by `/week-close`. Closes the active week, calculates velocity,
consolidates daily notes, and archives.

## Steps

### 1. Load the active week

```bash
grep -l "phase: active" plan/W*.md 2>/dev/null
```

If none is found, ask the user to specify which week to close.

### 2. Calculate metrics

From the week file frontmatter and body:
- `planned_capacity` — committed task count
- `completed_count` — count of `[x]` tasks in *Committed Tasks*
- `velocity` = `completed_count / planned_capacity` as a percentage

Compare to the prior week's velocity in `plan/archive/` if available.

### 3. Present the summary

- Week goal and whether it was met
- Task breakdown: `[N] done / [N] planned ([velocity]%)`
- Incomplete tasks, grouped by current status

### 4. Run WeeklySynthesis

Invoke `Workflows/WeeklySynthesis.md` to detect patterns, check goal
alignment, and draft forward-looking priorities. Present the synthesis to the
user before moving on.

### 5. Handle incomplete tasks

For each incomplete task, offer options based on current status:

| Current status | Options |
|---|---|
| `[ ]` To Do | Carry forward `[ ]` · Backlog `[I]` · Drop `[-]` · Pause `[?]` |
| `[/]` In Progress | Carry forward `[/]` · Pause `[?]` · Drop `[-]` |
| `[!]` Blocked | Carry forward `[!]` · Reset `[ ]` if unblocked · Drop `[-]` |
| `[?]` Paused | Carry forward `[?]` · Reset `[ ]` · Drop `[-]` |

Carried-forward tasks must keep the `#todo` tag in the source file.

Run `Skill("ProjectManagement", "UpdateTasks")` to sync changes back to source
files, then `Skill("ProjectManagement", "TaskSync")` to refresh
`dashboards/TASKS.md`.

### 6. Gather a brief retrospective

Ask:
- *"What went well this week?"*
- *"What would you change?"*
- *"Any action items for how you work?"*

### 7. Update the week file

Set in frontmatter:

```yaml
status: archived
phase: closed
closed: YYYY-MM-DD
completed_count: N
velocity: N%
```

(`status: archived` is the vault lifecycle enum — a closed week is archived
content; `phase: closed` is the week state machine. Keep both in sync.)

Append the retrospective to the *Retrospective* section.

### 8. Consolidate daily notes

Find all daily notes for this week: `plan/[DD-MM-YY]*.md`.

For each daily note:
1. Extract its *Close* section (skip if absent — the day was morning-only)
2. Append a summary row to the *Daily Progress* table in the week file
3. Extract the *Notes* section verbatim — preserved for step 9b

After extraction, `git rm plan/DD-MM-YY*.md` for each daily note.

### 9. Archive the week file

**9a. Filename convention** — archive name is `W[NN]_YYYY.md` (year only):

```bash
git mv plan/W[NN]_YYYY-MM-DD.md plan/archive/W[NN]_YYYY.md
```

Example: `plan/W16_2026-04-13.md` → `plan/archive/W16_2026.md`.

**9b. Append the Daily Notes Log** — at the end of the archive file:

```markdown
---

## Daily Notes Log

*Raw notes written by the user each day, preserved as written.*

### [Weekday DD Mon]

- note line 1
- note line 2

### [Weekday DD Mon]

*(no notes)*
```

Include every day of the week. Use `*(no notes)*` for empty days.

**9c. The only remaining copy must be the archive.** The root active file is
already moved by `git mv` in step 9a — no separate delete needed.

### 10. Reindex the knowledge base

Run `bun $HOME/.claude/skills/SecondBrain/Tools/QmdUpdate.ts` (or `qmd embed`) in
the background so the archived weekly note, deleted daily notes, and updated
projects are picked up by vault search.

### 11. Confirm

Report: *"Week W[x] closed. Velocity: [N]%. [N] tasks carried forward, [N]
dropped. Archived to `plan/archive/W[NN]_YYYY.md`."*
