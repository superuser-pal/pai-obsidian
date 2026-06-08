---
name: Quick Dump
description: One-shot classify + route + ripple. Skips inbox dwell time — input goes directly to domains/<T>/02_PAGES/<slug>.md with KnowledgeRipple stubs emitted. Use when you trust the classifier and want speed.
argument-hint: [content | url] [--domain Name] [--type T]
---

# /quick-dump — fast one-shot

Invoke the SecondBrain skill's QuickDump workflow:

```
Skill("SecondBrain", "QuickDump: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/QuickDump.md](../skills/SecondBrain/Workflows/QuickDump.md)
