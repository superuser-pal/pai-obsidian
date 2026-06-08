---
name: Capture
description: Drop content into inbox/raw/ (or thinking/ with --thinking). Accepts URLs (defuddled), file paths (--file), or freeform text. Pure capture — no classification, no frontmatter, no ripple.
argument-hint: [content | url | --file path] [--thinking]
---

# /capture — drop into inbox/raw

Invoke the SecondBrain skill's Capture workflow:

```
Skill("SecondBrain", "Capture: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/Capture.md](../skills/SecondBrain/Workflows/Capture.md)
