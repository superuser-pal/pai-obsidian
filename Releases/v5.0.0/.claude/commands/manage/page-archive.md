---
name: Page Archive
description: Archive a single domain page from domains/<T>/02_PAGES/ to 03_ARCHIVE/ with a deprecation header and status archived. Page-level counterpart to /project-archive (projects) and /domain-archive (whole domains).
argument-hint: <path/to/page.md> [--reason "..."]
---

# /page-archive — archive a domain page

Invoke the SecondBrain skill's ArchivePage workflow:

```
Skill("SecondBrain", "ArchivePage: $ARGUMENTS")
```

Workflow: [.claude/skills/SecondBrain/Workflows/ArchivePage.md](../../skills/SecondBrain/Workflows/ArchivePage.md)
