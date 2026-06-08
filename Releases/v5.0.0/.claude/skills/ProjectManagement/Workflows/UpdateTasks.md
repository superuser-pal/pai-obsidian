# UpdateTasks — push dashboard edits back to source files

Pushes task checkbox edits from `dashboards/TASKS.md` back to source project
files. Source-tag routed, conflict-aware.

## Trigger

"update tasks", "push tasks", "sync back", "update projects",
`/task-sync push`

## Steps

### 1. Read TASKS.md

For each task line, capture:

- Current checkbox symbol
- Source tag (`#Domain/ProjectName` or `#Domain/AD_HOC` or `#plan/[basename]`)
- Task text

Lines without a recognized source tag are ignored — UpdateTasks never touches
lines it didn't emit.

### 2. Read each source file

For each unique source tag, resolve the source path:

| Tag form | Source file |
|---|---|
| `#[name]/[Name]` | `domains/[name]/01_PROJECTS/PROJECT_[Name].md` |
| `#[name]/AD_HOC` | `domains/[name]/01_PROJECTS/AD_HOC_TASKS.md` |
| `#plan/[basename]` | `plan/[basename].md` |

### 3. Detect changes

Compare task checkbox symbols between TASKS.md and source files. A change
exists when:

- Symbol in TASKS.md differs from symbol in source, OR
- Task exists in TASKS.md but not in source (newly added)

### 4. Detect conflicts

A conflict exists when:

- Source `last_updated` is newer than TASKS.md `last_pulled`, AND
- The same task has different symbols in both

For each conflict, offer:

- **Force update** — use the TASKS.md version
- **Skip** — keep source, discard the TASKS.md edit
- **Review** — show side-by-side and ask

### 5. Apply changes

For non-conflicting changes:

- Update the checkbox symbol in the task line
- Update `last_updated` in source frontmatter to today
- If every task in a project is `[x]`, suggest setting `status: completed`

### 6. Update TASKS.md metadata

Update `last_updated` in `dashboards/TASKS.md` frontmatter.

### 7. Report

List all files modified and the changes applied. Flag any skipped conflicts.
