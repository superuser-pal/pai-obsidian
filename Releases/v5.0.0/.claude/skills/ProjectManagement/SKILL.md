---
name: ProjectManagement
description: "Create, track, sync, and archive domain-scoped projects across an Obsidian vault ($VAULT_DIR). Owns ProjectCreate (scaffold domains/[name]/01_PROJECTS/PROJECT_*.md with goal, priority, tasks), TaskSync (scan all domain projects + ad-hoc files → aggregate into dashboards/TASKS.md with #Domain/ProjectName source tags), UpdateTasks (push checkbox edits from TASKS.md back to source files via source-tag routing, conflict-aware), ArchiveProject (per-domain archive to domains/[name]/03_ARCHIVE/ + WINS.md entry with correct wikilink). Status symbols are Obsidian Tasks compatible: [ ] open, [/] in-progress, [!] blocked, [?] paused, [I] backlog, [-] dropped, [x] done. USE WHEN project-create, new project in domain, task-sync, pull tasks, aggregate tasks, push tasks, update tasks dashboard, archive project, close project, complete project, task dashboard. NOT FOR weekly planning rituals (use DailyRituals) or daily plan opening/closing (use SecondBrain OpenDay/CloseDay)."
---

# ProjectManagement — domain projects + task dashboard

This skill owns the project-and-task layer of the vault. Projects live
per-domain at `domains/[name]/01_PROJECTS/PROJECT_*.md`; ad-hoc tasks live
beside them in `AD_HOC_TASKS.md`; the bidirectional dashboard lives at
`dashboards/TASKS.md`.

**Operate from the vault.** All paths in this skill are relative to `$VAULT_DIR`
(your Obsidian vault). This skill has no path-resolving tools — its workflows run
bare relative shell commands and file writes (`domains/…`, `dashboards/TASKS.md`),
so make `$VAULT_DIR` the working directory first: `cd "$VAULT_DIR"` (or confirm CWD
is the vault). The dashboard `dashboards/TASKS.md` sits at the vault root
(Obsidian-visible).

## Workflow Routing

| Trigger | Workflow |
|---|---|
| "create project", `/project-create` | `Workflows/ProjectCreate.md` |
| "pull tasks", "sync tasks", `/task-sync` | `Workflows/TaskSync.md` |
| "push tasks", "update tasks", `/task-sync push` | `Workflows/UpdateTasks.md` |
| "archive project", `/project-archive` | `Workflows/ArchiveProject.md` |

## File paths

| Type | Path |
|---|---|
| Domain projects | `domains/[name]/01_PROJECTS/PROJECT_*.md` |
| Ad-hoc tasks | `domains/[name]/01_PROJECTS/AD_HOC_TASKS.md` |
| Master dashboard | `dashboards/TASKS.md` |
| Domain index | `domains/[name]/INDEX.md` |
| Per-domain archive | `domains/[name]/03_ARCHIVE/PROJECT_*.md` |
| Wins log | `domains/Work/01_PROJECTS/WINS.md` (created on first use) |

## Task Status Symbols

| Symbol | Status |
|---|---|
| `[ ]` | To Do |
| `[/]` | In Progress |
| `[!]` | Blocked |
| `[?]` | Paused |
| `[I]` | Backlog |
| `[-]` | Dropped |
| `[x]` | Done |

## TASKS.md Schema (canonical)

```markdown
# Task Dashboard
> Last synced: YYYY-MM-DD HH:MM AM/PM
> Sources: N project files across M domains

## [Domain Name]

### [Project Name]
- [ ] Task description #Domain/ProjectName
- [/] In-progress task #Domain/ProjectName
- [x] Completed task #Domain/ProjectName

## Ad-hoc
- [ ] Ad-hoc task #Domain/AD_HOC
```

**Rules:**
- Domain sections are H2 (`##`); project sections H3 (`###`); ad-hoc is its
  own H2 at the bottom.
- Every task line carries the source tag `#Domain/ProjectName` (or
  `#Domain/AD_HOC` for ad-hoc tasks). This is what UpdateTasks uses to route
  edits back to source files.
- **Canonical casing:** `Domain` is the domain folder name **verbatim**
  (PascalCase) — never lowercased. UpdateTasks routes by exact tag match, so any
  other producer of these tags (e.g. SecondBrain `/distribute` action
  extraction) MUST emit the same casing or tags duplicate / fail to round-trip.

## Boundary with DailyRituals

- `DailyRituals` reads `dashboards/TASKS.md` during `/week-prep` to surface
  committable tasks.
- DailyRituals does NOT write to source project files; status changes flow
  back through `Skill("ProjectManagement", "UpdateTasks")`.

## Boundary with SecondBrain

- `SecondBrain` owns daily routing, inbox lifecycle, and `domains/<T>/02_PAGES`.
- `ProjectManagement` owns `domains/<T>/01_PROJECTS` and `dashboards/TASKS.md`.
- `SecondBrain`'s `OpenDay` may read `dashboards/TASKS.md` for context, but
  never writes it directly.

## Gotchas

- **Templates are model-filled, not Templater-rendered.** `Templates/ProjectNote.md`
  uses `{{handlebars}}` placeholders (`{{date}}`, `{{goal}}`, `{{Human Readable Name}}`).
  The workflow tells you what to substitute — fill them inline when writing the file.
  There is no Obsidian Templater dependency.
- **Every task in TASKS.md MUST carry its `#Domain/ProjectName` tag.**
  UpdateTasks uses the tag to route edits back. Untagged lines are not synced.
- **UpdateTasks NEVER touches lines it didn't emit.** Tasks tracked outside
  the skill (custom notes, freeform plan entries) are left alone — only lines
  with a recognized source tag are reconciled.
- **`/project-archive` is per-domain in PAI.** Source's centralized
  `brain/MASTER_ARCHIVE/projects/` is replaced by
  `domains/[name]/03_ARCHIVE/PROJECT_*.md`. The wikilink in WINS.md must
  match: `[[domains/[name]/03_ARCHIVE/PROJECT_NAME]]`.
- **AD_HOC_TASKS.md is created lazily.** `ProjectCreate` creates it if missing
  on first project creation in a domain. `TaskSync` scans for it.
- **No EVIDENCE.md in PAI yet.** Source's `work/05_REVIEW/EVIDENCE.md` step is
  removed entirely from ArchiveProject — WINS.md only.
- **Project filenames are `PROJECT_UPPER_SNAKE_CASE.md`.** Convert spaces and
  punctuation to underscores; uppercase the entire identifier.
- **The 01_PROJECTS folder name has a leading underscore-zero-one.** Watch
  for sort-order surprises — Obsidian and `find` both sort this folder first
  inside the domain.
