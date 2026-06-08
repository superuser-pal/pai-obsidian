---
name: Project Create
description: Create a new project at domains/[name]/01_PROJECTS/PROJECT_[NAME].md with goal, priority, and initial tasks. Creates AD_HOC_TASKS.md if missing.
argument-hint: [domain] [name]
---

# /project-create — new domain project

Invoke the ProjectManagement skill's ProjectCreate workflow:

```
Skill("ProjectManagement", "ProjectCreate: $ARGUMENTS")
```

Workflow: [.claude/skills/ProjectManagement/Workflows/ProjectCreate.md](../../skills/ProjectManagement/Workflows/ProjectCreate.md)
