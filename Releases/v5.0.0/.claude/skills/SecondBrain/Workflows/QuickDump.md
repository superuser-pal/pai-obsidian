# QuickDump Workflow

One-shot route: input → classified → in a domain page → entities rippled. No
inbox dwell time. Use when you trust the heuristics and don't want a two-step.

## Steps

1. **Capture-equivalent preprocessing** (see [Capture.md](Capture.md)):
   - URL → `defuddle`. File → read. Text → as-is.
2. **Classify type:**
   - If content has wikilinks matching a People/Companies/Research pattern → that type.
   - If H1 starts with "idea:", "paper:", "research:" → corresponding type.
   - Otherwise: `Note`.
3. **Generate frontmatter** (run `date +"%Y-%m-%d %I:%M %p"` for timestamps — local time, never ISO 8601 / UTC Z):
   ```yaml
   ---
   type: <classified type>
   created: <date +"%Y-%m-%d %I:%M %p">
   source: quick-dump
   discovered: <date +"%Y-%m-%d %I:%M %p">
   tags: [<derived from content>]
   title: <derived>
   ---
   ```
4. **Resolve target domain:**
   ```
   bun .claude/skills/SecondBrain/Tools/ResolveDomain.ts <tmp-write-path>
   ```
   - If `target` is `null` (unclear): prompt user with candidates; offer `--domain <Name>` override or `/create-domain <Name>`.
5. **Write to `domains/<T>/02_PAGES/<YYYY-MM-DD>-<slug>.md`.**
6. **Ripple entities:**
   ```
   bun .claude/skills/SecondBrain/Tools/KnowledgeRipple.ts <target>
   ```
7. **Snapshot** to `MEMORY/ARCHIVE/secondbrain-snapshots/` (same as Distribute).
8. **Log:**
   ```
   bun .claude/skills/SecondBrain/Tools/IngestLog.ts \
     --action quick-dump --source-note <target>
   ```
9. **Report:** target path, type, ripple stub count.

## When NOT to use QuickDump

- When the source needs editing/curation before it lands (use `/save`).
- When the content might span multiple domains (use `/capture` → `/process` → `/distribute` for the considered path).
- When you're unsure of the classification (use `/save` for the interactive pass).
