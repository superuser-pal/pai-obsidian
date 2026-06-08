---
name: Project Archive
description: Archive a completed domain project to domains/[name]/03_ARCHIVE/ with WINS entry and INDEX update. Per-domain archive (not centralized).
argument-hint: [project-name]
---

# /project-archive — archive a domain project

Invoke the ProjectManagement skill's ArchiveProject workflow:

```
Skill("ProjectManagement", "ArchiveProject: $ARGUMENTS")
```

Workflow: [.claude/skills/ProjectManagement/Workflows/ArchiveProject.md](../../skills/ProjectManagement/Workflows/ArchiveProject.md)
