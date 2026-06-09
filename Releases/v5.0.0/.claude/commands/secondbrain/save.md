---
name: Save
description: Considered one-shot. Light edit + dedup check + wikilink resolution + classify + route + entity upsert (typed notes into domains/Knowledge/) + cascade preview. The "care" path; QuickDump is the "speed" path.
argument-hint: [content | url | --file path] [--domain Name]
---

# /save — considered one-shot

Invoke the SecondBrain skill's Save workflow:

```
Skill("SecondBrain", "Save: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/Save.md](../../skills/SecondBrain/Workflows/Save.md)
