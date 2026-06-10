# CreateDomain Workflow

Scaffold a new topical area at `domains/<Name>/`.

## Steps

1. **Validate the name:**
   - PascalCase recommended (`Work`, `Health`, `OpenSource`).
   - Reject: empty, whitespace-containing, slashes, special chars.
   - If `domains/<Name>/` already exists: report "already exists" + path; halt (no destructive overwrite).

2. **Create the folder skeleton:**
   ```bash
   mkdir -p "domains/<Name>/01_PROJECTS"
   mkdir -p "domains/<Name>/02_PAGES"
   mkdir -p "domains/<Name>/03_ARCHIVE"
   touch    "domains/<Name>/01_PROJECTS/.gitkeep"
   touch    "domains/<Name>/02_PAGES/.gitkeep"
   touch    "domains/<Name>/03_ARCHIVE/.gitkeep"
   ```

3. **Write `domains/<Name>/INDEX.md`** (run `date +"%Y-%m-%d %I:%M %p"` for
   timestamps — local time, never ISO 8601 / UTC Z):
   ```markdown
   ---
   type: Note
   status: processed
   created: <local YYYY-MM-DD HH:MM AM/PM>
   source: create-domain
   discovered: <local YYYY-MM-DD HH:MM AM/PM>
   tags: [domain, index]
   title: <Name>
   domain: <Name>
   ---

   # <Name>

   _Topical home for <Name>-related content. Notes land in `02_PAGES/` via
   `/distribute`; multi-page efforts live in `01_PROJECTS/`; stale content moves
   to `03_ARCHIVE/`._

   ## Active Work

   _Auto-rebuilt by `/map-vault` from `01_PROJECTS/PROJECT_*.md` frontmatter
   (planning + active only). Hand-edits are overwritten on next map._

   <!-- map-vault:begin -->
   <!-- map-vault:end -->

   ## Projects

   _Multi-page initiatives. Move pages from `02_PAGES/` here when they grow into
   sustained efforts._

   ## Pages

   _Default landing zone. Browse via Obsidian's file tree._

   ## Archive

   _Completed, stale, or superseded content._
   ```

4. **Validate the write (enforce):**
   ```
   bun .claude/skills/Qmd/Tools/LintFrontmatter.ts domains/<Name>/INDEX.md --enforce
   ```
   On non-zero exit: leave the skeleton in place, surface the linter output,
   and halt. (Per Phase 1: the pipeline never ships a bad-state note.)

5. **Update parent index if it exists:**
   - If `domains/INDEX.md` exists, append a line linking to the new domain.
   - If not: skip silently (the parent index is optional).

6. **Refresh qmd:**
   ```
   bun .claude/skills/SecondBrain/Tools/QmdUpdate.ts
   ```

7. **Log:**
   ```
   bun .claude/skills/SecondBrain/Tools/IngestLog.ts \
     --action create-domain \
     --target-note domains/<Name>/INDEX.md
   ```

8. **Report** the INDEX path + the four subfolders created.

## Why PascalCase

- ResolveDomain.ts pattern matches PascalCase as the canonical form.
- Obsidian's file tree sorts predictably with PascalCase + the leading `01_`/`02_`/`03_` numeric prefixes on subfolders.
- Aligns with PAI conventions.

## Renaming a domain later

This workflow does NOT support rename. Use:
```
git mv domains/OldName domains/NewName
# then update INDEX.md frontmatter `title:` and `domain:` fields
# then qmd update
```
Then go through `02_PAGES/` and update each note's `domain:` frontmatter (a future workflow could automate this).
