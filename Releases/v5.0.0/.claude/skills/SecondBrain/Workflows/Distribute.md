# Distribute Workflow

Route every file in `inbox/ready/` to `domains/<T>/02_PAGES/`. Snapshot, upsert
entities, preview cascade.

## Steps

1. **Refresh index:**
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/QmdUpdate.ts
   ```
2. **List `inbox/ready/*.md`** (sorted by queue order — `QueueUpdate.ts list --pending`).

3. **Routing plan — confirm before any move (FR 2.3.2).**
   Resolve every ready file's destination *first*, then present the plan:
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/ResolveDomain.ts inbox/ready/<name>
   ```
   - `target` is a domain name → row `inbox/ready/<name> → domains/<target>/02_PAGES/<name>`.
   - `target` is `null` (`reason: unclear`) → row `held — <candidate list>`.

   Show the full table and ask the user to confirm: **all**, a **subset**, or
   **per-file**. Only confirmed files proceed to step 4. For each `held` file,
   prompt "Pick a domain or run `/create-domain <Name>` first," then skip it.
   No file is moved until this gate is cleared.

4. **For each confirmed file:**

   ### a. Snapshot
   ```
   cp inbox/ready/<name> \
     $PAI_DIR/PAI/MEMORY/ARCHIVE/secondbrain-snapshots/$(date -u +%Y%m%dT%H%M%SZ)-<slug>.md
   ```
   (Create the dir if needed; per plan §4 it's gitignored.)

   ### b. Move — then promote frontmatter (roll back BOTH on enforce-fail)
   Move first so a failed lint never strands a half-promoted note in
   `inbox/ready/` already stamped `status: processed` (wrong queue state for the
   Lifecycle.base "Ready" view and the next run).
   1. `git mv inbox/ready/<name> domains/<T>/02_PAGES/<name>` (preserve git history per CLAUDE.md vault conventions).
   2. Promote frontmatter on the moved file:
      - `distributed: <date +"%Y-%m-%d %I:%M %p">` (local time, never ISO Z).
      - `domain: <T>`
      - `status: processed` (promote from `ready`).
   3. Validate (enforce):
      ```
      bun $PAI_DIR/skills/Qmd/Tools/LintFrontmatter.ts domains/<T>/02_PAGES/<name> --enforce
      ```
      On non-zero exit, roll back **both**: restore the pre-promotion
      frontmatter AND `git mv` back to `inbox/ready/<name>`. Surface the finding,
      mark the file `held` in the report, and continue with the next queue entry.

   ### c. Backlinks (FR 2.3.3) — confirmed insertion
   Before ripple, give the note outbound links so it doesn't land as an immediate
   V3 orphan:
   - Always offer `[[<T>/INDEX]]` (the domain MOC link).
   - Run `qmd query "[[<title>]]"` and offer the top entity matches as
     `[[Entity]]` links.
   Present the proposed links and insert (a single Edit) only those the user
   confirms. Skip a link silently if the note already contains it.

   ### d. Ripple (entity upsert)
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/KnowledgeRipple.ts domains/<T>/02_PAGES/<name>
   ```
   Outputs JSON `{ written: [...], skipped: [...] }`. The `written` paths are
   typed entity notes created in `domains/Knowledge/` (type: person|company|idea|
   research) — visible in Obsidian and queryable via `bases/Knowledge.base`.
   `skipped` are entities that already exist somewhere in the vault.

   ### e. Action extraction (NOT auto-applied — confirmed per action)

   Per Phase 12 §4 / old-spec §2.3.4: distributed notes get scanned for
   `[action]` markers. Only `[action]` extracts; `[todo]` stays inline
   (Phase 8 vocabulary split).

   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/ExtractActions.ts \
     domains/<T>/02_PAGES/<name> --json
   ```

   If `actions` is non-empty, for each action:

   1. Pick a target file. Default candidates, in order:
      - The note's `domain:` frontmatter → choose a `01_PROJECTS/PROJECT_*.md`
        in that domain (prompt user with the list of project basenames).
      - Fallback: `domains/<T>/01_PROJECTS/AD_HOC_TASKS.md` (create if
        missing — `Skill("ProjectManagement", "TaskAdd: <T> <text>")` covers
        both paths).
   2. Compute the source tag from the chosen project file. The canonical form
      is `#<Domain>/<Name>` with the **domain folder name verbatim** (PascalCase,
      not lowercased) — this is what ProjectManagement's TaskSync / UpdateTasks
      route on, so the casing MUST match exactly or round-tripping breaks:
      - `domains/<T>/01_PROJECTS/PROJECT_<NAME>.md` → `#<T>/<NAME>`
        (`<T>` = domain folder verbatim; NAME is the suffix after `PROJECT_`)
      - `domains/<T>/01_PROJECTS/AD_HOC_TASKS.md`  → `#<T>/AD_HOC`
   3. Append to the chosen file (under the project's `### To Do` section, or
      `## Active` for `AD_HOC_TASKS.md`):
      ```
      - [ ] <action text> #todo #<T>/<NAME>
      ```
   4. Confirm with the user before each append.

   After all actions are appended (or none confirmed), call
   `Skill("ProjectManagement", "TaskSync")` so `dashboards/TASKS.md` reflects
   the new tasks. If no actions, skip both steps.

   ### f. Cascade preview (NOT auto-applied)
   ```
   qmd query "[[<title>]]"
   ```
   - List the top 5 matches.
   - Show each as: "✏️ Consider adding `[[<this note>]]` to `<that page>`? (y/n)"
   - For each `y`, perform a single Edit that ADDS the wikilink at an appropriate point.
   - For `n`, leave that page untouched.

   ### g. Queue + log
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/QueueUpdate.ts complete inbox/ready/<name> --target domains/<T>/02_PAGES/<name>
   bun $PAI_DIR/skills/SecondBrain/Tools/IngestLog.ts \
     --action distribute \
     --source-note inbox/ready/<name> \
     --target-note domains/<T>/02_PAGES/<name>
   ```

4. **Report:** count distributed, count held (unclear), count of entity notes upserted into `domains/Knowledge/`, count of cascade edits accepted.

## Plan §13 R7 — cascade is suggested, not automatic

The user MUST confirm each cross-reference update. Never auto-edit related pages
even when the qmd score is high — Obsidian users edit their notes intentionally
and may have reasons for current link absence.

## Idempotency

If a file in `inbox/ready/` matches an existing `domains/<T>/02_PAGES/<name>`,
the workflow:
1. Snapshot the current target.
2. Diff the two; if identical → skip (mark queue complete).
3. If different → prompt: replace, **absorb**, or keep both with `-1` suffix
   on the new one. "Absorb" runs `AbsorbNote.ts` (see below) to append the
   ready file into the existing target as one atomic step.

## Phase 5: Absorb (formalized merge — old-spec §2.3.7)

When the user picks "absorb" in the idempotency prompt, or `qmd vsearch`
returns a near-duplicate target (≥80% similarity) for a different name,
delegate to `AbsorbNote.ts`:

```
bun $PAI_DIR/skills/SecondBrain/Tools/AbsorbNote.ts \
  --source inbox/ready/<name> \
  --target domains/<T>/02_PAGES/<existing>
```

The tool does four steps atomically:
1. Snapshot the source to `$PAI_DIR/PAI/MEMORY/ARCHIVE/secondbrain-snapshots/`
2. Append source body under `## Absorbed from <source-stem>` in target
3. Log `{action: absorb, source_note, target_note, snapshot}` to IngestLog
4. Delete the source

Run BEFORE step 3.d (KnowledgeRipple) — the entity ripple should look at
the absorbed target's new content, not the about-to-be-deleted source.

## Phase 5: Split (offered after distribute — old-spec §2.3.6)

After a successful distribute (file landed at
`domains/<T>/02_PAGES/<name>`), scan the page for split-eligibility:

```
bun $PAI_DIR/skills/SecondBrain/Tools/SplitNote.ts \
  domains/<T>/02_PAGES/<name> --json
```

Trigger: `meets_threshold: true` (≥3 top-level `##` headings with content).

If the user confirms the split:

```
bun $PAI_DIR/skills/SecondBrain/Tools/SplitNote.ts \
  domains/<T>/02_PAGES/<name> --apply \
  --target-dir domains/<T>/02_PAGES/
```

Each child page gets `synthesized-from: ["[[<source>]]"]` and a `## Related`
section pointing at siblings + the source. The source's `##` sections are
removed; the source retains intro + a `## Related` map listing the children.
Source `status:` stays `processed` (the split doesn't reset its lifecycle).

Don't auto-split — confirmation is mandatory. The threshold (`##` count ≥3)
is intentionally simple; the user is the final judge of "page-worthy".
