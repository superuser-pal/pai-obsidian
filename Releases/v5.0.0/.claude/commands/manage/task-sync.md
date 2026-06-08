---
name: Task Sync
description: Sync tasks between source files and dashboards/TASKS.md. Default = pull (TaskSync). Pass `push` to push dashboard edits back to source files (UpdateTasks).
argument-hint: [push]
---

# /task-sync — pull or push tasks against the dashboard

Default (pull) — aggregate tasks from `domains/*/01_PROJECTS/` and
`plan/*.md` into `dashboards/TASKS.md`:

```
Skill("ProjectManagement", "TaskSync: $ARGUMENTS")
```

If the first argument is `push`, the skill routes to UpdateTasks instead —
read TASKS.md, route checkbox edits back to source files via
`#Domain/ProjectName` tags, surface conflicts.

```
Skill("ProjectManagement", "UpdateTasks: $ARGUMENTS")
```

Workflows:
- [TaskSync](../../skills/ProjectManagement/Workflows/TaskSync.md)
- [UpdateTasks](../../skills/ProjectManagement/Workflows/UpdateTasks.md)
