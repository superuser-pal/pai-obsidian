---
name: DailyRituals
description: "Weekly planning rituals layered on top of SecondBrain's daily layer. Owns the week-prep / week-close / week-cycle / weekly-synthesis workflows: creates plan/W[week]_YYYY-MM-DD.md weekly files with committed tasks and week goal, closes a week with velocity metrics + analytical synthesis + archival to plan/archive/, and orchestrates the full close → synthesize → prep cycle. Reads PRINCIPAL_TELOS (auto-loaded at session start), domains/Work/01_PROJECTS/, and dashboards/TASKS.md to ground weekly intent. Files (all under $VAULT_DIR): plan/W[NN]_YYYY-MM-DD.md (weekly, Monday-start), plan/archive/W[NN]_YYYY.md (archived weeks), plan/[DD-MM-YY].md (daily — owned by SecondBrain). USE WHEN week-prep, week-close, week-cycle, weekly synthesis, plan my week, close out the week, weekly review, weekly cycle, what did I ship this week, start a new week, end of week. NOT FOR daily plan opening or closing (use SecondBrain OpenDay/CloseDay). NOT FOR project-level archival (use ProjectManagement)."
---

# DailyRituals — weekly planning layer

This skill owns the **weekly** rhythm on top of PAI's `plan/` folder. The daily
rhythm (`/open-day`, `/close-day`) belongs to `SecondBrain`. Use this skill to
prep the week ahead, close out a week with metrics and synthesis, or run the
full cycle in one shot.

**Operate from the vault.** All paths in this skill are relative to `$VAULT_DIR`
(your Obsidian vault). This skill has no path-resolving tools — its workflows run
bare relative shell commands (`plan/W*.md`, `dashboards/TASKS.md`), so make
`$VAULT_DIR` the working directory first: `cd "$VAULT_DIR"` (or confirm CWD is the
vault). Weekly files live at `plan/W[NN]_YYYY-MM-DD.md`, archives at
`plan/archive/W[NN]_YYYY.md`.

## Workflow Routing

| Trigger | Workflow |
|---|---|
| "plan my week", `/week-prep` | `Workflows/WeekPrep.md` |
| "close the week", `/week-close` | `Workflows/WeekClose.md` |
| "weekly cycle", `/week-cycle` | `Workflows/WeekCycle.md` |
| Internal — called by WeekClose | `Workflows/WeeklySynthesis.md` |

## File paths

| Type | Path | Naming |
|---|---|---|
| Daily notes | `plan/` | `DD-MM-YY.md` (owned by SecondBrain) |
| Active week | `plan/` | `W[NN]_YYYY-MM-DD.md` |
| Archived week | `plan/archive/` | `W[NN]_YYYY.md` |
| Domain projects | `domains/Work/01_PROJECTS/` | `PROJECT_*.md` |
| Domain archive | `domains/Work/03_ARCHIVE/YYYY/` | created on first use |
| Wins log | `domains/Work/01_PROJECTS/WINS.md` | created on first use |
| Task dashboard | `dashboards/TASKS.md` | populated by ProjectManagement |

## Status symbols (Obsidian Tasks plugin compatible)

| Symbol | Meaning |
|---|---|
| `[ ]` | To Do |
| `[/]` | In Progress |
| `[!]` | Blocked / On Hold |
| `[?]` | Paused |
| `[I]` | Backlog |
| `[-]` | Dropped |
| `[x]` | Done |

## Boundary with SecondBrain

| Skill | Owns | Files |
|---|---|---|
| **SecondBrain** | `/open-day`, `/close-day`, daily routing | `plan/DD-MM-YY.md`, inbox/, domains/ |
| **DailyRituals** | `/week-prep`, `/week-close`, `/week-cycle`, weekly synthesis | `plan/W*.md`, `plan/archive/W*.md` |

When a workflow needs daily data (e.g. WeekClose consolidating daily notes),
it reads them directly — it does not call SecondBrain back.

## Boundary with ProjectManagement

DailyRituals reads `dashboards/TASKS.md` to surface committable tasks during
`/week-prep`. It does NOT write to source project files — task status changes
flow through `Skill("ProjectManagement", "UpdateTasks: …")`.

## Gotchas

- **Templates are model-filled, not Templater-rendered.** `Templates/WeekNote.md`
  and `Templates/DailyNote.md` use `{{handlebars}}` placeholders (`{{week_number}}`,
  `{{date}}`, `{{day_suffix}}`, `{{date_readable}}`). Each workflow's "Fill:" step
  lists what to substitute — fill them inline when writing the file. There is no
  Obsidian Templater dependency.
- **Only one active week at a time.** `WeekPrep` warns if it finds an existing
  `status: active` week file in `plan/`. Close before prepping the next.
- **Carried-forward tasks keep their `#todo` tag in the source file.** The week
  file is a *selection*, not a copy — the source remains canonical.
- **Status moves at daily granularity, not weekly.** `WeekPrep` does NOT flip
  `[ ]` → `[/]` — that happens during `/open-day` when a task becomes today's
  focus.
- **Archive filename uses year only**: `W14_2026.md`, not `W14_2026-04-06.md`.
  The full date is for the active file; the archive collapses to the year.
- **PRINCIPAL_TELOS is already in context** at session start (auto-imported via
  CLAUDE.md). Weekly synthesis treats it as a read, not a fetch.
- **Expansion comments are intentional.** Lines marked `# EXPANSION: restore
  when …` reference sub-domain folders (`work/02_1-1/`, `work/03_INCIDENTS/`,
  `work/05_REVIEW/`) that don't exist in PAI yet. They are scaffolding for the
  day they do — do not delete them.
