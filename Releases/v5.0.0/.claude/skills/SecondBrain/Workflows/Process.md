# Process Workflow

Promote every file in `inbox/raw/` to `inbox/ready/` with full frontmatter.

## Steps

1. **Refresh search index:**
   ```
   bun .claude/skills/SecondBrain/Tools/QmdUpdate.ts
   ```
2. **List `inbox/raw/*.md`** (sorted by mtime ascending — process oldest first).
3. **For each raw file:**
   - Read content; parse existing frontmatter (may be partial or empty).
   - Run advisory lint on the raw input (warnings only — never block here;
     /process exists to fix what's missing):
     ```
     bun .claude/skills/Qmd/Tools/LintFrontmatter.ts <file>
     ```
   - Derive missing fields:
     - `title`: first H1 → first 60 chars → filename.
     - `type`: heuristic (see [AssetClasses.md](../References/AssetClasses.md)).
     - `status`: promote `unprocessed` → `ready`. If hand-set to `thinking`,
       skip this file (thinking notes don't promote through /process).
     - `created`: file mtime formatted as `date +"%Y-%m-%d %I:%M %p"` (local time, e.g. `2026-05-20 08:23 PM`) if missing. Never ISO 8601 / UTC Z.
     - `source`: preserve if present, else infer from filename (`url:` prefix → `url`, etc.) → `capture`.
     - `discovered`: `date +"%Y-%m-%d %I:%M %p"` (local time) if missing. Never ISO 8601 / UTC Z.
     - `tags`: preserve + derive from content keywords if empty.
   - Write the new file content to `inbox/ready/<same-name>`.
   - Validate the write (enforce):
     ```
     bun .claude/skills/Qmd/Tools/LintFrontmatter.ts inbox/ready/<name> --enforce
     ```
     On non-zero exit: leave both raw and ready in place, surface the
     finding, mark this file `held` in the report, and continue with the
     next file. The pipeline never produces a bad-state ready/ note.
   - Remove the file from `inbox/raw/`.
   - Add to pending queue:
     ```
     bun .claude/skills/SecondBrain/Tools/QueueUpdate.ts add inbox/ready/<name> --title "<title>"
     ```
   - Log:
     ```
     bun .claude/skills/SecondBrain/Tools/IngestLog.ts \
       --action process \
       --source-note inbox/raw/<name> \
       --target-note inbox/ready/<name>
     ```
4. **Report counts:** files processed, files skipped (with reasons), advisory warnings raised.

## Frontmatter additions never destructive

If the raw file already has a frontmatter field, `/process` PRESERVES it. New
fields are added; existing fields are never overwritten silently.

The only field `/process` overwrites is `discovered:` if it was set incorrectly
(e.g., a date earlier than `created:`).

## Exit conditions

- `inbox/raw/` is empty → "nothing to process" (exit 0).
- Lint reports F1 (missing frontmatter) → still process (we add it).
- Lint reports F4 (bad date) → preserve user's value but flag in report.
- Post-write `--enforce` lint fails for one file → mark `held`, keep both
  raw and ready copies, continue with next file. Reported count: processed
  / held / skipped (thinking).
