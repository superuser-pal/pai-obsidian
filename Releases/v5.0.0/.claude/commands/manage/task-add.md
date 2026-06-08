---
name: Task Add
description: Append a task to a project or AD_HOC_TASKS.md, then refresh dashboards/TASKS.md.
argument-hint: [domain] [task text]
---

# /task-add — add a task to a domain project or ad-hoc file

Invoke the ProjectManagement skill's ProjectCreate workflow to route the
addition (it covers both new-project and add-to-existing paths). For a pure
append to AD_HOC_TASKS.md plus a TaskSync refresh, the skill picks that path
based on arguments.

```
Skill("ProjectManagement", "TaskAdd: $ARGUMENTS")
```

Workflow: [.claude/skills/ProjectManagement/Workflows/ProjectCreate.md](../../skills/ProjectManagement/Workflows/ProjectCreate.md)
(append-to-ad-hoc fallback) and [.claude/skills/ProjectManagement/Workflows/TaskSync.md](../../skills/ProjectManagement/Workflows/TaskSync.md).
