---
name: Process
description: Promote every file in inbox/raw/ to inbox/ready/ with full frontmatter (type, created, source, discovered, tags, title). Runs qmd update first. Advisory frontmatter lint runs but never blocks.
argument-hint: (none — operates on inbox/raw/*)
---

# /process — raw → ready

Invoke the SecondBrain skill's Process workflow:

```
Skill("SecondBrain", "Process: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/Process.md](../skills/SecondBrain/Workflows/Process.md)
