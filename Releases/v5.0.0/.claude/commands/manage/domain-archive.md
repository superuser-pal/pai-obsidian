---
name: Domain Archive
description: Deprecate an entire domain — adds a callout to INDEX.md and promotes its frontmatter status to archived. REFUSES if any 01_PROJECTS/PROJECT_*.md is still planning or active (use /project-archive on each first).
argument-hint: <Name> [--reason "..."]
---

# /domain-archive — deprecate a whole domain

Invoke the SecondBrain skill's DomainArchive workflow:

```
Skill("SecondBrain", "DomainArchive: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/DomainArchive.md](../../skills/SecondBrain/Workflows/DomainArchive.md)
