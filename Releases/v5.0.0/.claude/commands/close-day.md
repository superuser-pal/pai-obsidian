---
name: Close Day
description: Evening reconcile. Aggregates today's secondbrain-ingest.jsonl events, composes a reflection (highlights / loose threads / surprises), appends a JSON line to MEMORY/LEARNING/REFLECTIONS/secondbrain-close-day.jsonl, updates today's plan file.
argument-hint: [--date YYYY-MM-DD]
---

# /close-day — evening reconcile

Invoke the SecondBrain skill's CloseDay workflow:

```
Skill("SecondBrain", "CloseDay: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/CloseDay.md](../skills/SecondBrain/Workflows/CloseDay.md)
