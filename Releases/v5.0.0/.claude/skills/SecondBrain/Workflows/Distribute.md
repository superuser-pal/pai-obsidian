# Distribute Workflow

Route every file in `inbox/ready/` to `domains/<T>/02_PAGES/`. Snapshot, upsert
entities, preview cascade.

## Steps

1. **Refresh index:**
   ```
   bun .claude/skills/SecondBrain/Tools/QmdUpdate.ts
   ```
2. **List `inbox/ready/*.md`** (sorted by queue order — `QueueUpdate.ts list --pending`).
3. **For each ready file:**

   ### a. Snapshot
   ```
   cp inbox/ready/<name> \
     .claude/PAI/MEMORY/ARCHIVE/secondbrain-snapshots/$(date -u +%Y%m%dT%H%M%SZ)-<slug>.md
   ```
   (Create the dir if needed; per plan §4 it's gitignored.)

   ### b. Resolve domain
   ```
   bun .claude/skills/SecondBrain/Tools/ResolveDomain.ts inbox/ready/<name>
   ```
   - If `target` is a domain name → use it.
   - If `target` is `null` (`reason: unclear`):
     - Print the candidate list.
     - Prompt user: "Pick a domain or run `/create-domain <Name>` first."
     - Halt this file; continue to next.

   ### c. Move
   - Append/promote frontmatter:
     - `distributed: <date +"%Y-%m-%d %I:%M %p">` (local time, never ISO Z).
     - `domain: <T>`
     - `status: processed` (promote from `ready`).
   - `git mv inbox/ready/<name> domains/<T>/02_PAGES/<name>` (preserve git history per CLAUDE.md vault conventions).
   - Validate the write (enforce):
     ```
     bun .claude/skills/Qmd/Tools/LintFrontmatter.ts domains/<T>/02_PAGES/<name> --enforce
     ```
     On non-zero exit: roll back the `git mv` (`git mv` back to
     `inbox/ready/`), surface the finding, mark this file `held` in the
     report, and continue with the next queue entry.

   ### d. Ripple (entity upsert)
   ```
   bun .claude/skills/SecondBrain/Tools/KnowledgeRipple.ts domains/<T>/02_PAGES/<name>
   ```
   Outputs JSON `{ written: [...], skipped: [...] }`. The `written` paths are
   typed entity notes created in `domains/Knowledge/` (type: person|company|idea|
   research) — visible in Obsidian and queryable via `bases/Knowledge.base`.
   `skipped` are entities that already exist somewhere in the vault.

   ### e. Cascade preview (NOT auto-applied)
   ```
   qmd query "[[<title>]]"
   ```
   - List the top 5 matches.
   - Show each as: "✏️ Consider adding `[[<this note>]]` to `<that page>`? (y/n)"
   - For each `y`, perform a single Edit that ADDS the wikilink at an appropriate point.
   - For `n`, leave that page untouched.

   ### f. Queue + log
   ```
   bun .claude/skills/SecondBrain/Tools/QueueUpdate.ts complete inbox/ready/<name> --target domains/<T>/02_PAGES/<name>
   bun .claude/skills/SecondBrain/Tools/IngestLog.ts \
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
3. If different → prompt: replace, merge (open editor), or keep both with `-1` suffix on the new one.
