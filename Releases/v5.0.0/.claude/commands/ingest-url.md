---
name: Ingest URL
description: End-to-end URL pipeline. defuddle → inbox/raw → process → distribute, all in one chain. No inbox dwell time. Strips tracker params by default.
argument-hint: <url> [--type T] [--domain Name] [--tags t1,t2] [--no-cascade] [--keep-tracking]
---

# /ingest-url — URL → domain page in one chain

Invoke the SecondBrain skill's IngestUrl workflow:

```
Skill("SecondBrain", "IngestUrl: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/IngestUrl.md](../skills/SecondBrain/Workflows/IngestUrl.md)
