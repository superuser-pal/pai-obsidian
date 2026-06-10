# ProjectCreate — create a new domain project

Invoked by `/project-create` or trigger phrases like "create project", "new
project", "start project".

## Steps

### 1. Select the domain

List available domains:

```bash
ls domains/
```

Ask the user which domain this project belongs to. If none exist, offer to
run `/create-domain` first.

### 2. Gather project info

Collect from the user:

- **Name** — short identifier, becomes `PROJECT_[NAME].md` in
  `UPPER_SNAKE_CASE`
- **Goal** — one sentence describing the objective
- **Priority** — `low | medium | high | critical` (default: `medium`)
- **Initial tasks** — optional list of first tasks
- **Deadline** — optional target date

### 3. Create the project file

Write to `domains/[name]/01_PROJECTS/PROJECT_[NAME].md` using
`Templates/ProjectNote.md`.

Also check whether `domains/[name]/01_PROJECTS/AD_HOC_TASKS.md` exists. If
not, create it:

```markdown
# Ad-hoc Tasks: [Domain Name]

Tasks not associated with a specific project in this domain.

## Active

- [ ]
```

Fill project frontmatter:

```yaml
type: Project
name: PROJECT_[NAME]
domain: [domain-name]
goal: "[goal text]"
status: planning
priority: [priority]
due_date:              # optional — ask user if they have a target date
completion_date:       # leave blank; set on archive
tags: []
created: [today YYYY-MM-DD]
last_updated: [today YYYY-MM-DD]
```

`type: Project` lets `bases/ActiveWork.base` (Phase 12 §3) filter project
files cleanly. `LintFrontmatter` exempts PROJECT_*.md from its SecondBrain
status enum since `Project` is not a SecondBrain entity type.

Every open task in the *To Do* section must carry the `#todo` tag:

```markdown
### To Do
- [ ] Task description #todo

### In Progress

### Done
```

### 4. Update the domain INDEX

Open `domains/[name]/INDEX.md` and add the project under the Projects section:

```
- [[PROJECT_[NAME]]] — [goal text]
```

### 5. Refresh the dashboard

Invoke `Workflows/TaskSync.md` so `dashboards/TASKS.md` includes the new
project.

### 6. Confirm

Report the created file path and the first tasks added.
