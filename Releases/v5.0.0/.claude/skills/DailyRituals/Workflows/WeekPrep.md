# WeekPrep — weekly planning workflow

Invoked by `/week-prep`. Creates the weekly plan file, selects committed
tasks, and activates the week.

## Steps

### 1. Check for an active week

```bash
grep -l "status: active" plan/W*.md 2>/dev/null
```

If one is found, surface it and ask:

> "Week W[x] is still active. Close it first with `/week-close`, or continue
> planning without closing?"

### 2. Calculate week dates

From today (`date "+%Y-%m-%d"`):
- ISO week number (e.g. `14`)
- Week start (Monday) and end (Sunday)
- Year

### 3. Set the week goal

Ask: *"What's the one-sentence goal for this week?"* (a theme, not a task
list). Capture verbatim.

### 4. Select committed tasks

Read `dashboards/TASKS.md` and show all trackable tasks grouped by
domain/project, ordered:

1. `[!]` Blocked — surface first; these need unblocking decisions
2. `[/]` In Progress — already underway; likely carry forward
3. `[ ]` To Do — available to commit

Ask the user to select 3–7 tasks to commit. If they pick more than 7, warn:
*"More than 7 tasks risks overcommitment. Proceed?"*

Optionally collect stretch goals.

### 5. Create the week file

Write `plan/W[NN]_YYYY-MM-DD.md` from `Templates/WeekNote.md`. Fill:

- `week_number`, `year`, `start_date`, `end_date`
- `week_goal`
- `planned_capacity` = count of committed tasks
- `status: planning`

Populate the *Committed Tasks — To Do* section with the selected `[ ]` tasks
and the *In Progress* section with any `[/]` tasks carried forward. Preserve
the `#todo` tag and source link on every entry.

### 6. Activate the week

Ask: *"Activate this week now?"*

If yes:
- Set `status: active` in the week file
- Do NOT touch task status in source project files — tasks stay `[ ]` until
  `/open-day` picks them as today's focus
- Run `Skill("ProjectManagement", "TaskSync")` to refresh `dashboards/TASKS.md`

> **Rule:** WeekPrep declares intent. `[ ]` → `[/]` happens during `/open-day`,
> not here.

### 7. Confirm

Report: *"Week W[x] created with [N] committed tasks and goal: '[goal]'."*
