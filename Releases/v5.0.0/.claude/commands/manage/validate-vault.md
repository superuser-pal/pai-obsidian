---
name: Validate Vault
description: Audit every domain for skeleton, naming, orphans, depth, and frontmatter compliance. Advisory only — no auto-fix. Use --domain <Name> to scope, --json for machine-readable, --strict to exit non-zero on findings.
argument-hint: [--domain <Name>] [--json] [--strict]
---

# /validate-vault — domain hygiene audit

Invoke the SecondBrain skill's ValidateVault workflow:

```
Skill("SecondBrain", "ValidateVault: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/ValidateVault.md](../../skills/SecondBrain/Workflows/ValidateVault.md)
