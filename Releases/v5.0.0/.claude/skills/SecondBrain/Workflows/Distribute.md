# Distribute Workflow

Route every file in `inbox/ready/` to `domains/<T>/02_PAGES/`. Snapshot, ripple,
preview cascade.

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
   - Append to frontmatter: `distributed: <now ISO>`, `domain: <T>`.
   - `git mv inbox/ready/<name> domains/<T>/02_PAGES/<name>` (preserve git history per CLAUDE.md vault conventions).

   ### d. Ripple
   ```
   bun .claude/skills/SecondBrain/Tools/KnowledgeRipple.ts domains/<T>/02_PAGES/<name>
   ```
   Outputs JSON `{ written: [...], skipped: [...] }`. The `written` paths are
   harvest-queue stubs; PAI's `KnowledgeHarvester.ts` consumes them on its own
   schedule.

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

4. **Report:** count distributed, count held (unclear), count of harvest-queue stubs emitted, count of cascade edits accepted.

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
