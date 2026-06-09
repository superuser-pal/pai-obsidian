---
name: Distribute
description: Route every file in inbox/ready/ to domains/<T>/02_PAGES/. Snapshots before write, upserts [[entities]] as typed notes in domains/Knowledge/ via KnowledgeRipple (queryable via bases/Knowledge.base), previews cascade updates to related pages (user confirms each — never auto-applied).
argument-hint: [--file path] [--domain Name] [--no-cascade]
---

# /distribute — ready → domain page

Invoke the SecondBrain skill's Distribute workflow:

```
Skill("SecondBrain", "Distribute: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/Distribute.md](../../skills/SecondBrain/Workflows/Distribute.md)
