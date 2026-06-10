---
name: Map Vault
description: Rebuild domain INDEX "Active Work" tables from project frontmatter, propose confirmed renames (with inbound [[wikilink]] rewrites in lockstep), and report true orphans. Report-only by default; --apply rebuilds INDEX tables; --apply-renames performs the confirmed rename batch.
argument-hint: [--domain <Name>] [--apply] [--apply-renames] [--json]
---

# /map-vault — domain mapper + naming fix-up

Invoke the SecondBrain skill's MapVault workflow:

```
Skill("SecondBrain", "MapVault: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/MapVault.md](../../skills/SecondBrain/Workflows/MapVault.md)
