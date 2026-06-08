# ArchiveProject — archive a completed domain project

Archives a finished or cancelled project from
`domains/[name]/01_PROJECTS/` to `domains/[name]/03_ARCHIVE/`, writes a WINS
entry, and refreshes the dashboard.

## Trigger

"archive project", "close project", "complete project", `/project-archive`

## Steps

### 1. Identify the project

Accept the project name as an argument, or ask the user. Search
`domains/*/01_PROJECTS/PROJECT_*.md`. Confirm with the user before
proceeding.

**Detect the source domain** from the path: the segment after `domains/` and
before `/01_PROJECTS/`. The archive destination is built from this — there
is no centralized archive in PAI.

### 2. Warn if not completed

If `status` is not `completed` or `cancelled`, ask:

> *"This project status is [status]. Archive anyway?"*

### 3. Collect the archive reason

- `completed` — delivered as planned
- `cancelled` — no longer relevant
- `superseded` — replaced by another project
- custom — ask for free text

### 4. Update frontmatter

In the project file:

```yaml
status: completed    # or cancelled
completion_date: YYYY-MM-DD
last_updated: YYYY-MM-DD
```

Add the deprecation header below frontmatter:

```markdown
> [!note] Archived [YYYY-MM-DD]
> **Reason**: [reason]
> **Original location**: `domains/[detected-domain]/01_PROJECTS/PROJECT_[NAME].md`
```

### 5. Move the file (per-domain archive)

```bash
mkdir -p domains/[detected-domain]/03_ARCHIVE
git mv \
  domains/[detected-domain]/01_PROJECTS/PROJECT_[NAME].md \
  domains/[detected-domain]/03_ARCHIVE/PROJECT_[NAME].md
```

### 6. Capture wins

Read the archived project file. Scan for completed tasks, shipped features,
and key decisions. Ask:

> *"Any wins worth adding to WINS.md from this project?"*

If the user approves (or wins are obvious), append entries to
`domains/Work/01_PROJECTS/WINS.md` (create it if missing). Use the
**per-domain archive** wikilink form:

```markdown
- [Win title] — [[domains/[detected-domain]/03_ARCHIVE/PROJECT_[NAME]]] (Impact / Collaboration / Technical Growth)
```

If WINS.md has no section for the current quarter, create one:

```markdown
## Q[N] YYYY
```

Only write entries the user explicitly approves. Skip if the project was
cancelled with no notable output.

> EVIDENCE.md from the source workflow is intentionally removed — there is no
> PAI equivalent and no expansion path planned.

### 7. Update the domain INDEX

Remove the project from the Projects section of
`domains/[detected-domain]/INDEX.md`. Add it to an Archive section:

```
- [[PROJECT_[NAME]]] — [goal] *(archived [date])*
```

### 8. Refresh the dashboard

Invoke `Workflows/TaskSync.md` to remove the archived project's tasks from
`dashboards/TASKS.md`.

### 9. Verify

Confirm no broken wikilinks. Obsidian resolves by filename, so renames
generally preserve links — but the explicit
`[[domains/[detected-domain]/03_ARCHIVE/PROJECT_[NAME]]]` references in
WINS.md should be spot-checked.
