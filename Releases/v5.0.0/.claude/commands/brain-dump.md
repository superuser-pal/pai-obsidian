---
name: Brain Dump
description: Atomic observation extraction. Splits input on [category] markers — each becomes a separate file in inbox/raw/. Recognized categories include idea, observation, todo, question, note, bookmark, quote, decision, risk, learning, gripe (others accepted verbatim).
argument-hint: [stream of [category] tagged observations]
---

# /brain-dump — atomic observations

Invoke the SecondBrain skill's BrainDump workflow:

```
Skill("SecondBrain", "BrainDump: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/BrainDump.md](../skills/SecondBrain/Workflows/BrainDump.md)
