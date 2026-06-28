# ValidateVault Workflow

Audit every domain under `$VAULT_DIR/domains/` for structural compliance.
Advisory only — no auto-fix (that's `/map-vault` in Phase 3).

## Steps

1. **Run the auditor:**
   ```
   bun $HOME/.claude/skills/SecondBrain/Tools/ValidateVault.ts
   ```
   - Scope to one domain with `--domain <Name>`.
   - `--json` for machine-readable output.
   - `--strict` to exit non-zero on any `warn` finding (CI / pre-commit).

2. **Read the report.** The tool walks every regular domain and surfaces:

   | Code | Check | Severity |
   |---|---|---|
   | V1  | Skeleton present (`INDEX.md, 01_PROJECTS/, 02_PAGES/, 03_ARCHIVE/`) | warn |
   | V2a | `01_PROJECTS/*.md` matches `PROJECT_<UPPER_SNAKE>.md` or `AD_HOC_TASKS.md` | warn |
   | V2b | `02_PAGES/*.md` is kebab-case | warn |
   | V2c | Domain folder is PascalCase | warn |
   | V3  | Notes have ≥1 `[[wikilink]]` in body (outbound orphan check) | warn |
   | V4  | Files no more than 3 levels below domain root | warn |
   | F*  | `LintFrontmatter` findings (F1–F7) per file | warn / info |

   `domains/Knowledge/` is treated as a special domain (entity-notes flat
   folder managed by `KnowledgeRipple`) — skeleton + naming rules don't apply,
   and V3 (orphan) is skipped entirely: entity notes link via frontmatter
   (`related:`/`seen_in:`), which the body-only orphan check can't see. Special
   domains are still walked for `LintFrontmatter` findings.

3. **Present findings to the user.** Group by domain; for each finding show
   `[severity] code path: message`. End with the totals line.

4. **Do not auto-fix.** Even if a finding looks trivial (e.g. a stray
   `01_PROJECTS/foo.md` that should be `PROJECT_FOO.md`), confirm-and-defer:
   the auto-rename pass belongs to `/map-vault` which performs a confirmed
   `git mv` and updates inbound links in lockstep.

## What V3 (orphan) catches and doesn't

- **Catches:** notes with zero `[[wikilinks]]` in the body — outbound orphans.
- **Doesn't catch:** notes nobody links *to* (inbound orphans). That check
  requires walking the whole vault to build a backlink index, which Phase 3's
  `/map-vault` does anyway when it rebuilds Active Work tables. Don't
  duplicate the scan here.
- **Excluded from V3:** `INDEX.md`, `AD_HOC_TASKS.md`, and `PROJECT_*.md` —
  these list things via other syntaxes (project sections, task checkboxes), so
  they routinely ship with no wikilinks and aren't orphans in any useful sense.
  Notes in special domains (e.g. `Knowledge`) are excluded too — they link via
  frontmatter, not body wikilinks.

## When to run

- After a manual reorg (you moved files around in Obsidian).
- Before a publish / sync (catches naming drift early).
- After upgrading the fork (catches new invariants the linter now flags).
- Periodically (weekly) as part of domain hygiene.

## Exit conditions

- Advisory default: always exit 0. Surface the report.
- `--strict`: exit 1 if any `warn` finding. `info` findings still don't block.
- Empty vault (no `domains/` or no children): empty report, exit 0.
