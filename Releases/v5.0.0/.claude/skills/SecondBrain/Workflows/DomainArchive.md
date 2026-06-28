# DomainArchive Workflow

Deprecate an entire domain. Active-content protected — refuses if any
`01_PROJECTS/PROJECT_*.md` carries `status: planning | active`.

## Steps

1. **Dry-run first to surface anything blocking:**
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/ArchiveDomain.ts \
     --domain <Name> --dry-run --json
   ```
   The output lists `active_projects` (if any). Exit code 2 means
   "BLOCKED — active projects must be archived first".

2. **If blocked, archive each active project:** for each entry in
   `active_projects`, run `/project-archive`. Re-run the dry-run after
   each, until `active_projects` is empty.

3. **Collect a reason from the user.** A one-line reason explains *why*
   the domain is being retired (e.g. "merged into [[Engineering]]",
   "scope no longer relevant", "operator focus shift"). The reason lands
   in the deprecation header on INDEX.md.

4. **Apply the archive:**
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/ArchiveDomain.ts \
     --domain <Name> --reason "<one line>"
   ```
   The tool:
   - Re-runs the guard (it's possible a new active project was added
     between the dry-run and the apply).
   - Inserts a `> [!warning] Domain archived <ts>` callout block at the
     top of `INDEX.md`'s body.
   - Promotes `INDEX.md` frontmatter `status:` → `archived`.
   - Annotates the row in `domains/INDEX.md` (if it exists) with
     `_(archived)_`.
   - Logs `{action: archive-domain, target_note, extra: {domain, reason}}`
     to IngestLog.

5. **Tell the user what didn't happen.** Be explicit: the folder is NOT
   physically moved. Existing notes stay readable. New writes should go
   elsewhere — the domain is now dormant. If they want a physical move:
   ```
   git mv domains/<Name> domains/_archived/<Name>
   ```
   (and then re-run any inbound link rewrites via `/map-vault`.)

## Why active-content protection?

A domain archive should never silently bury in-progress work. If a
project says `status: active`, the user is currently working on it —
archiving the containing domain would hide their own work behind a
"domain archived" callout that they then have to undo. Forcing the
explicit `/project-archive` round-trip per project keeps the lifecycle
honest: each project's `completion_date` and archive reason get
captured by the project-archive workflow before the domain shuts down.

## Reversal

Domain archive is reversible: open `INDEX.md`, change
`status: archived` back to `status: processed`, delete the callout
block, drop the `_(archived)_` annotation in the parent index. No tool
auto-revives because reviving is rare — by the time the operator wants
the domain back, they typically also want to refresh INDEX content,
which is a manual review.
