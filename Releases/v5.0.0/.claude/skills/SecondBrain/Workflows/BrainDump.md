# BrainDump Workflow

Atomic observation extraction. Input is a freeform stream containing `[category]`
markers; each marker becomes a separate file in `inbox/raw/`.

## Input syntax

```
[idea] Could compress prompts via shared cache keys.
[observation] Latency spikes at 14:00 — likely cron load.
[todo] Email Bob about the deploy.
[question] Why does the SSE channel drop after 30 min?
```

The `[category]` is at the start of a line. The observation continues until the
next `[category]` marker or end of input.

## Steps

1. **Parse the input** into observation chunks:
   - Regex: `/^\[(\w+)\]\s+(.*?)(?=^\[\w+\]|\z)/gms`
   - Each match yields `{category, body}`.
2. **For each chunk:**
   - Slug: `<YYYY-MM-DD>-<category>-<n>` where `<n>` increments per session.
   - Write `inbox/raw/<slug>.md` with this minimal shape (run
     `date +"%Y-%m-%d %I:%M %p"` for `discovered:`):
     ```markdown
     ---
     status: unprocessed
     source: brain-dump
     discovered: <local YYYY-MM-DD HH:MM AM/PM>
     tags: [brain-dump, <category>]
     ---

     <body>
     ```
   - Validate the write (enforce):
     ```
     bun .claude/skills/Qmd/Tools/LintFrontmatter.ts inbox/raw/<slug>.md --enforce
     ```
     On non-zero exit, surface the linter output, leave the file in place,
     and halt the batch.
   - Log event:
     ```
     bun .claude/skills/SecondBrain/Tools/IngestLog.ts \
       --action brain-dump \
       --source-note inbox/raw/<slug>.md \
       --type <category>
     ```
3. **Report** the count of files written and a summary table:
   ```
   3 observations captured:
   - [idea]        2026-05-19-idea-0.md
   - [observation] 2026-05-19-observation-0.md
   - [todo]        2026-05-19-todo-0.md
   ```

## Edge cases

- **No `[category]` markers found** → treat the whole input as a single `[note]` observation.
- **Empty body after marker** → skip; don't write empty files.
- **Repeated category in same dump** → suffix `<n>` increments naturally (`-0`, `-1`, `-2`).

## Recognized categories (informational, not enforced)

Merged old-spec + fork union (see [Capture.md](Capture.md) for the same table
with descriptions):

`fact`, `idea`, `decision`, `technique`, `requirement`, `question`, `insight`,
`problem`, `solution`, `action`, `observation`, `todo`, `note`, `bookmark`,
`quote`, `risk`, `learning`, `gripe`.

Unknown categories are written as-is (the tag becomes the literal category
string) — the taxonomy is open, never enforced.

### `[action]` and `[todo]` are distinct

Only `[action]` is extracted into a project's task list by `/distribute`
(Phase 4). `[todo]` is preserved inline with the `#todo` tag and stays
surfaced via tag search in Obsidian — no auto-routing. Use:

- `[action]` — task you want the project task system to pick up
- `[todo]` — inline reminder you'll handle yourself

This distinction matters because `/brain-dump` writes the `category` into
`tags:`, and `/distribute`'s action-extraction step matches on the literal
token `action`. Misusing `[todo]` won't trigger extraction.
