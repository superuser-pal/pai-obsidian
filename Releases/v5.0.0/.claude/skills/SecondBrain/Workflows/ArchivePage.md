# ArchivePage — archive a single domain page

Archives one evergreen page from `domains/<T>/02_PAGES/` to
`domains/<T>/03_ARCHIVE/` with a deprecation header and `status: archived`
(old-spec FR 1.4.1). The page-level counterpart to `/project-archive` (which
only covers `01_PROJECTS/PROJECT_*.md`) and `/domain-archive` (whole domains).

## Trigger

"archive page", "archive this note", "deprecate page", `/page-archive`

## Steps

### 1. Identify the page

Accept the page path as an argument, or ask the user. The target must be a
`.md` under some `domains/<T>/02_PAGES/`. Reject (and redirect) if the path is:

- `01_PROJECTS/PROJECT_*.md` or `AD_HOC_TASKS.md` → use `/project-archive`.
- already under `03_ARCHIVE/` → already archived; nothing to do.

**Detect the source domain** from the path: the segment after `domains/` and
before `/02_PAGES/`. The archive destination is built from this — there is no
centralized archive in the vault.

Confirm the resolved `from → to` with the user before proceeding.

### 2. Collect the archive reason

- `superseded` — replaced by another page (ask which; offer to wikilink it)
- `stale` — no longer accurate or relevant
- `merged` — content absorbed elsewhere (note the target)
- custom — ask for free text

### 3. Update frontmatter

Promote `status` to the lifecycle enum value `archived` (passes the
LintFrontmatter F7 check) and stamp the archive date:

```yaml
status: archived
archived: <date +"%Y-%m-%d %I:%M %p">   # local time, never ISO Z
```

Add the deprecation header immediately below the frontmatter block:

```markdown
> [!warning] Archived <YYYY-MM-DD>
> **Reason**: <reason>
> **Original location**: `domains/<T>/02_PAGES/<name>.md`
```

### 4. Move the file (per-domain archive)

```bash
mkdir -p domains/<T>/03_ARCHIVE
git mv \
  domains/<T>/02_PAGES/<name>.md \
  domains/<T>/03_ARCHIVE/<name>.md
```

(`git mv` preserves history per the vault conventions; falls back to a plain
move outside git.)

### 5. Validate the write (enforce)

```
bun $HOME/.claude/skills/Qmd/Tools/LintFrontmatter.ts domains/<T>/03_ARCHIVE/<name>.md --enforce
```

On non-zero exit, roll back the move (`git mv` back to `02_PAGES/`) and the
frontmatter promotion, surface the finding, and stop.

### 6. Update the domain INDEX

If `domains/<T>/INDEX.md` links the page from a Pages/Current State section,
move that link into an Archive section (create it if missing):

```markdown
- [[<name>]] — <one-line description> *(archived <date>)*
```

### 7. Log + verify

```
bun $HOME/.claude/skills/SecondBrain/Tools/IngestLog.ts \
  --action archive-page \
  --source-note domains/<T>/02_PAGES/<name>.md \
  --target-note domains/<T>/03_ARCHIVE/<name>.md
```

Spot-check inbound `[[<name>]]` wikilinks. Obsidian resolves by filename, so the
move generally preserves links; flag any that explicitly encoded the
`02_PAGES/` path.
