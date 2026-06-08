# TaskSync — pull tasks into the dashboard

Aggregates tasks from all project sources into `dashboards/TASKS.md`.

## Trigger

"pull tasks", "sync tasks", "aggregate tasks", "show tasks", `/task-sync`

## Sources to scan

1. **Domain projects** — `domains/*/01_PROJECTS/PROJECT_*.md`
2. **Ad-hoc tasks** — `domains/*/01_PROJECTS/AD_HOC_TASKS.md`
3. **Active plan files** — `plan/*.md` (excluding `plan/archive/*`)

> The legacy `work/01_PROJECTS/*.md` source category is collapsed into
> `domains/Work/01_PROJECTS/` in PAI — there is no separate `work/` tree.

## Steps

### 1. Discover all project files

```bash
find domains -type f \( -name "PROJECT_*.md" -o -name "AD_HOC_TASKS.md" \) -not -path "*/03_ARCHIVE/*"
```

Also list `plan/*.md` (excluding `plan/archive/*`).

### 2. Extract tasks per source

For each file, extract:

- Open tasks — `- [ ]` lines (must carry `#todo`)
- In-progress — `- [/]`
- Blocked / paused / backlog / dropped — `- [!]`, `- [?]`, `- [I]`, `- [-]`
- Done — `- [x]` (recent only — last 7 days by `last_updated`)

Preserve inline metadata: `#todo`, additional `#tag`s, `📅 YYYY-MM-DD` date
emojis, `✅ YYYY-MM-DD` completions.

**Tag each task with its source.** Tag format is unified after migration:

| File | Tag |
|---|---|
| `domains/[name]/01_PROJECTS/PROJECT_[Name].md` | `#[name]/[Name]` |
| `domains/[name]/01_PROJECTS/AD_HOC_TASKS.md` | `#[name]/AD_HOC` |
| `plan/W*.md`, `plan/[DD-MM-YY].md` | `#plan/[basename]` |

### 3. Build TASKS.md

Write to `dashboards/TASKS.md` using the canonical schema (frontmatter +
H2 domain sections, H3 project sections, ad-hoc H2 at the bottom):

```markdown
---
last_pulled: [YYYY-MM-DD HH:MM AM/PM]
last_updated: [YYYY-MM-DD HH:MM AM/PM]
domains_scanned: [list]
total_projects: N
total_tasks: N
open_tasks: N
in_progress_tasks: N
blocked_tasks: N
---

# Task Dashboard

> Last synced: [date] | [N] projects across [M] domains | [N] open tasks

## Alerts
[list any blocked or stale items here]

## [Domain Name]

### [Project Name]
- [/] Task in progress #Domain/ProjectName
- [ ] Task to do #Domain/ProjectName
- [!] Blocked task #Domain/ProjectName

## Ad-hoc
- [ ] Ad-hoc task #Domain/AD_HOC

## Done (recent)
- [x] Task completed in last 7 days #Domain/ProjectName

---
*Pull with `/task-sync` · Push back with `/task-sync push`*
```

### 4. Report

Show summary: *N domains scanned, N projects found, N open tasks, N blocked.*
