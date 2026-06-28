# QuickDump Workflow

One-shot route: input → classified → in a domain page → entities upserted into
`domains/Knowledge/`. No inbox dwell time. Use when you trust the heuristics and
don't want a two-step.

## Steps

1. **Capture-equivalent preprocessing** (see [Capture.md](Capture.md)):
   - URL → `defuddle`. File → read. Text → as-is.
2. **Classify type:**
   - If content has wikilinks matching a People/Companies/Research pattern → that type.
   - If H1 starts with "idea:", "paper:", "research:" → corresponding type.
   - Otherwise: `Note`.
3. **Generate frontmatter** (run `date +"%Y-%m-%d %I:%M %p"` for timestamps — local time, never ISO 8601 / UTC Z). QuickDump skips the inbox dwell, so the
   note lands directly with `status: processed`:
   ```yaml
   ---
   type: <classified type>
   status: processed
   created: <date +"%Y-%m-%d %I:%M %p">
   source: quick-dump
   discovered: <date +"%Y-%m-%d %I:%M %p">
   tags: [<derived from content>]
   title: <derived>
   ---
   ```
4. **Resolve target domain:**
   ```
   bun $HOME/.claude/skills/SecondBrain/Tools/ResolveDomain.ts <tmp-write-path>
   ```
   - If `target` is `null` (unclear): prompt user with candidates; offer `--domain <Name>` override or `/create-domain <Name>`.
5. **Write to `domains/<T>/02_PAGES/<YYYY-MM-DD>-<slug>.md`.**
6. **Snapshot** the written file to `MEMORY/ARCHIVE/secondbrain-snapshots/` — BEFORE
   the enforce gate, same ordering as Distribute. The source was raw input (not a
   tracked file), so this snapshot is the only recovery copy if step 7 deletes the
   write.
7. **Validate the write (enforce):**
   ```
   bun $HOME/.claude/skills/Qmd/Tools/LintFrontmatter.ts domains/<T>/02_PAGES/<YYYY-MM-DD>-<slug>.md --enforce
   ```
   On non-zero exit: delete the just-written file, surface the linter output, and
   halt. The step-6 snapshot retains the content for recovery.
8. **Upsert entities** (creates typed notes in `domains/Knowledge/`):
   ```
   bun $HOME/.claude/skills/SecondBrain/Tools/KnowledgeRipple.ts <target>
   ```
9. **Log:**
   ```
   bun $HOME/.claude/skills/SecondBrain/Tools/IngestLog.ts \
     --action quick-dump --source-note <target>
   ```
10. **Report:** target path, type, count of entity notes upserted into `domains/Knowledge/`.

## When NOT to use QuickDump

- When the source needs editing/curation before it lands (use `/save`).
- When the content might span multiple domains (use `/capture` → `/process` → `/distribute` for the considered path).
- When you're unsure of the classification (use `/save` for the interactive pass).
