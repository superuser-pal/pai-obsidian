---
name: Create Domain
description: Scaffold a new topical area at domains/<Name>/ with INDEX.md and 01_PROJECTS/, 02_PAGES/, 03_ARCHIVE/ subfolders (each with .gitkeep). PascalCase names recommended. Refuses to overwrite existing domains.
argument-hint: <Name>
---

# /create-domain — scaffold a topical area

Invoke the SecondBrain skill's CreateDomain workflow:

```
Skill("SecondBrain", "CreateDomain: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/CreateDomain.md](../../skills/SecondBrain/Workflows/CreateDomain.md)
