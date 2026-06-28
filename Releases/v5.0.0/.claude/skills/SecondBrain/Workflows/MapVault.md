# MapVault Workflow

Rebuild domain INDEX "Active Work" tables, propose naming fixes (with
inbound-link rewrites in lockstep), and report true orphans.

Default mode is **report-only** — no writes. The rebuild + rename steps are
gated behind explicit flags, and the rename step waits for per-rename
confirmation in this workflow.

## Steps

1. **Run the mapper in report mode:**
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/MapVault.ts
   ```
   - Scope to one domain with `--domain <Name>`.
   - `--json` for machine-readable output.

2. **Read the report.** Per domain, the tool reports:

   | Block | Meaning |
   |---|---|
   | INDEX state | Whether INDEX.md exists, has map-vault markers, and whether the Active Work table would change |
   | Active Work count | How many `01_PROJECTS/PROJECT_*.md` files matched `status: planning|active` |
   | Rename proposals | Files violating V2a (`01_PROJECTS/`) or V2b (`02_PAGES/`), each with the inbound wikilink references that would be rewritten on apply |
   | Orphans | Notes with zero outbound AND zero inbound wikilinks (the genuine ones) |

3. **Apply the Active Work table rebuild** (deterministic, recoverable —
   markers bound the section so hand-written content elsewhere stays):
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/MapVault.ts --apply
   ```
   Only rebuilds INDEX.md sections that have both `<!-- map-vault:begin -->`
   and `<!-- map-vault:end -->` markers. If an INDEX is missing markers, the
   tool flags it instead of patching silently — recreate the INDEX via
   `/create-domain` or add the markers by hand.

4. **Handle rename proposals one at a time.** For each proposal:
   - Show the user: `from → to`, the reason (`V2a` / `V2b`), the count and
     a preview of the inbound `[[wikilink]]` references that will be
     rewritten in lockstep.
   - Confirm: *"Rename and update N inbound references? (y/n/skip-all)"*
   - On **y**: tag this rename for the batch.
   - On **n**: skip; the file stays misnamed and a follow-up `/map-vault`
     will re-propose it.
   - On **skip-all**: stop showing rename prompts; proceed to step 6.

5. **Apply the confirmed rename batch.** Pass the source basenames the user
   accepted via `--only` (comma-separated) so only those renames apply —
   true per-rename confirmation, not all-or-nothing:
   ```
   bun $PAI_DIR/skills/SecondBrain/Tools/MapVault.ts --apply-renames --only <from1>.md,<from2>.md
   ```
   If the user accepted *every* proposal, `--only` can be omitted to apply the
   whole batch. Either way the tool performs `git mv` (preserves history) for
   each selected rename and rewrites the inbound `[[wikilink]]` references in the
   same pass. If a non-git directory is encountered, falls back to `fs.rename`.

6. **Report orphans.** Show the orphan list to the user. Do NOT auto-delete
   — orphans are the user's call (some are works-in-progress; some are
   genuine cruft).

7. **Optional refresh** of `qmd update` and the Knowledge.base / Lifecycle.base
   indexes so the rename batch is reflected immediately.

## When to run

- After `/validate-vault` flags naming violations or stale INDEX tables.
- Weekly as part of vault hygiene.
- Before publishing a domain externally.

## What `--apply` is safe to repeat

Yes — the Active Work table is regenerated from frontmatter on every run, so
running `--apply` twice in a row is idempotent. Markers protect hand-written
INDEX content outside the table.

## What `--apply-renames` is NOT safe to repeat

Renames are not idempotent after they've been applied — running again would
either no-op (good) or attempt to re-rename files that have already shipped
to their canonical form. The workflow's per-proposal confirmation is what
makes the rename batch trustworthy; never run `--apply-renames` outside this
workflow.

## Active Work table format

Markdown table inside `<!-- map-vault:begin -->` / `<!-- map-vault:end -->`
markers in INDEX.md. Columns: Project (wikilink), Status, Priority, Last
updated. Sorted by `last_updated` desc, then by name. Empty domains get a
`_No active work in this domain._` placeholder.

The Obsidian-native counterpart is `bases/ActiveWork.base` — a Base that
filters all `type: Project AND status IN (planning, active)` notes across the
vault. Both stay in sync because both read the same frontmatter.

## Bounded by frontmatter

The table only surfaces `01_PROJECTS/PROJECT_*.md` files where
`status: planning|active`. Completed / archived projects aren't shown — they
live in INDEX's `## Archive` section or `03_ARCHIVE/`.
