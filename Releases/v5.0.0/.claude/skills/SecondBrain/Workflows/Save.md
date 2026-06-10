# Save Workflow

The "considered" one-shot. Adds editing + dedup + wikilink resolution on top of
QuickDump. Use when the source is worth a moment of curation.

## Steps

1. **Capture-equivalent preprocessing** (URL/file/text).
2. **Light edit pass** — keep the user's voice. Apply only:
   - Fix obvious typos and broken markdown (unbalanced asterisks, etc.).
   - Restore paragraph breaks where reflow stripped them.
   - Strip tracker query params from URLs (`?utm_*`, `?ref=*`).
   - Do NOT rewrite tone, condense, or expand. The note keeps its character.
3. **`qmd update`** then **`qmd query <derived title>`** → check for duplicates:
   - If a result scores ≥80% similarity, surface to user with: "Looks similar
     to `<path>` (score X%). **Absorb** into it, replace it, or keep both?"
   - **Absorb** (Phase 12 §5 — formalized) → delegate to `AbsorbNote.ts`:
     ```
     bun .claude/skills/SecondBrain/Tools/AbsorbNote.ts \
       --source <staged-save-path> \
       --target <existing-page>
     ```
     The tool snapshots the source, appends under
     `## Absorbed from <source-stem>` in target, logs the event, and deletes
     the source — atomically. Skip remaining Save steps (7–11) for this
     input; report the absorb result.
   - **Replace** → overwrite the existing page with the staged content.
   - **Keep both** → default. Mark `dedup-considered: true` in frontmatter
     and proceed with steps 4+ to land at a fresh path.
4. **Wikilink resolution** — for each `[[X]]` already in the body:
   - `qmd query "<X>"` → if a top-1 match exists with score ≥85%, leave as-is.
   - If a partial match exists (e.g., `[[Alice]]` → `Alice Example`), prompt user to disambiguate.
   - Otherwise leave the wikilink as a forward reference (the entity upsert will create the note in `domains/Knowledge/`).
5. **Classify type and add frontmatter** (same as QuickDump steps 2–3). Run `date +"%Y-%m-%d %I:%M %p"` for `created`/`discovered` — local time, never ISO 8601 / UTC Z. Save also skips the inbox dwell, so the note lands with `status: processed`.
6. **Resolve target domain** via `ResolveDomain.ts`.
7. **Snapshot + write to `domains/<T>/02_PAGES/<slug>.md`.**
8. **Validate the write (enforce):**
   ```
   bun .claude/skills/Qmd/Tools/LintFrontmatter.ts domains/<T>/02_PAGES/<slug>.md --enforce
   ```
   On non-zero exit: delete the just-written file (the snapshot already
   exists for recovery), surface the linter output, and halt.
9. **Upsert entities** via `KnowledgeRipple.ts` (typed notes into `domains/Knowledge/`).
10. **Cascade preview** — `qmd query [[<this title>]]` → list pages that mention this note. Show the user; do NOT auto-edit cross-references (plan §13 R7).
11. **Log + report.**

## Edge cases

- **Massive paste (>20K chars)** → suggest `/process` + `/distribute` two-step instead; one-shot Save is meant for shorter pieces.
- **Note is a fragment** → still write; let user enrich later via Obsidian.

## Distinct from QuickDump

QuickDump is *speed* (high-throughput). Save is *care* (mid-volume, considered). Both are one-shot.
