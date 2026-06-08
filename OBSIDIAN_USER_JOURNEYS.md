# Obsidian User Journeys — UX analysis of the 7 Obsidian skills

> Analysis date: 2026-06-09. Lens: **Obsidian is the primary UI** — the user lives in the
> Obsidian app, not a terminal. Grounded in a file-level read of every workflow/tool/reference
> in `Releases/v5.0.0/.claude/skills/{Qmd,ObsidianMarkdown,ObsidianBases,ObsidianCLI,SecondBrain,
> ProjectManagement,DailyRituals}` (three parallel agents + spot-verification of all P0 claims).
> This report drives the Part Two backlog; promote the P0/P1 rows into `OBSIDIAN_FORK_BACKLOG.md`.

---

## The central tension

The skill *logic* is sound and the tool layer is clean. But every workflow is a **Claude Code
(terminal) operation**, while the user wants to live in **Obsidian**. That mismatch produces the
same failure shape over and over: the user must leave Obsidian, type a request in a terminal, and
results appear back in vault files — and much of the system's *state* never appears in the vault at
all. Three structural patterns dominate every journey below:

1. **No way to trigger from inside Obsidian.** The documented `/capture`, `/process`, `/week-prep`,
   `/task-sync` slash commands **do not exist as files** (verified: `commands/` holds only
   `context-search.md`, `cs.md`, `pu.md`, `qmd/`). Skills still auto-trigger on natural-language
   phrases, but the documented affordance is fictional and there is no Obsidian-side button/URI/
   command-palette bridge.
2. **The `$VAULT_DIR`/`$PAI_DIR` split is silently violated.** Workflows use bare relative paths
   (`ls inbox/raw/`, `git mv plan/…`, `cp .claude/PAI/MEMORY/…`) and `bun .claude/skills/…`,
   assuming one root holds both the vault and `.claude/`. The fork deliberately separated them.
   Worse, errors are swallowed by `2>/dev/null`, so a wrong CWD looks like "empty inbox / no active
   week" instead of failing loudly.
3. **The system of record is invisible in the vault.** The pending queue, pre-distribute snapshots,
   the ingest log, daily reflections, and the entire `[[Entity]]`→harvest-graph pipeline all live
   under `$PAI_DIR` (`~/.claude`). An Obsidian-first user cannot see, verify, or trust any of it.

---

## Journey 1 — Daily capture lifecycle (SecondBrain + Qmd)

**Sequence:** `08:05` morning open-day → creates `$VAULT_DIR/plan/<DD-MM-YY>.md` (TELOS focus +
inbox state). `09:40` fleeting thought → `inbox/raw/<date>-<slug>.md`, **no frontmatter**. `11:15`
URL via ingest-url → `defuddle` extracts → lands a finished page in `domains/<X>/02_PAGES/` with full
frontmatter (the smoothest moment, *when defuddle is installed*). `13:30` meeting brain-dump → one
atomic note **per `[marker]`** in `inbox/raw/` (a 6-marker dump = 6 new files at once). `15:00`
process → each raw note gets full frontmatter and **moves** `raw/ → ready/`. `15:20` distribute →
files `git mv` into `domains/.../02_PAGES/`, a **confirmation-gated** cascade asks per related page
"add `[[this]]` to `<that>`?", entities ripple to the harvest queue. `15:45` retrieval → `qmd query`
answers with mandatory `[[wikilink]]` citations (read-only). `18:30` close-day → populates the plan's
"What landed today" and surfaces `pending-classification` stubs.

**What the user sees in Obsidian:** notes appearing/moving through `inbox/raw → inbox/ready →
domains/`, and clickable wikilink citations. **What they can't see:** the queue, snapshots, ripple
stubs, and reflections (all under `$PAI_DIR`).

---

## Journey 2 — Weekly planning + projects (DailyRituals + ProjectManagement)

**Sequence:** Monday week-prep → `grep "status: active" plan/W*.md`, pick 3–7 committed tasks, write
`plan/W[NN]_YYYY-MM-DD.md` (`status: active`). project-create → `domains/<D>/01_PROJECTS/
PROJECT_NAME.md` + `INDEX.md` link + lazy `AD_HOC_TASKS.md`. task-sync → aggregates all project/ad-hoc/
plan tasks into `dashboards/TASKS.md` with `#Domain/Project` source tags. **During the week** the user
ticks checkboxes *inside Obsidian* on `dashboards/TASKS.md` (Tasks plugin) — no skill fires, dashboard
diverges from sources. task-sync push → routes checkbox edits back to source files by tag. Friday
week-close → velocity = done/planned, WeeklySynthesis from `git log`, consolidates + **`git rm`s the
daily notes** into the week file, archives `plan/archive/W[NN]_YYYY.md`. project-archive → `git mv` to
`03_ARCHIVE/`, WINS.md entry, INDEX.md move.

**The dashboard is the intended live UI** — but it's **static markdown** that goes stale the moment a
source changes and only refreshes on manual `/task-sync`. The round-trip has real correctness holes
(tag casing, untagged-line loss, conflict detection — below).

---

## Journey 3 — Authoring + retrieval + database-view UI (Qmd + ObsidianMarkdown + ObsidianBases + ObsidianCLI)

**The most Obsidian-native cluster.** Three bridges: **qmd** (read, disk-based, doesn't need Obsidian
open) → synthesis with `[[wikilink]]` citations → **`obsidian` CLI** (write/act into the *running*
app) → **Bases** (`.base` files = native database views). **Sequence:** retrieval (`qmd query`/`/ask`)
→ dedup-before-create (`qmd vsearch`) → author a well-formed evergreen note (frontmatter properties,
`> [!info]` callouts, `![[embeds]]`, wikilinks) written live via `obsidian create … silent` → linkback
(`qmd vsearch "<title>"`) → reindex (`qmd update`) → a `bases/Domains.base` table grouped by `type`
makes the vault a queryable dashboard with no third-party plugin.

**This is the strongest realization of "Obsidian as primary UI"** — retrieval output authored in
Obsidian's own link grammar, and `.base` dashboards as a real database UI. It breaks at the seams:
external CLIs unprovisioned, the `obsidian` CLI needs the app open, and nothing renders out-of-box
because the installer ships no `.obsidian/` plugin config.

---

## Cross-cutting findings → consolidated backlog

Deduped across all three journeys, prioritized. "Touches" cites the file(s) to change.

### P0 — blocks the Obsidian-as-UI premise or is a correctness bug

| # | Finding | Evidence | Touches |
|---|---|---|---|
| P0-1 | **Ship the 10 SecondBrain slash commands.** Documented as shipping "thin wrappers"; none exist, so the entire documented entry point is unreachable. | `SecondBrain/SKILL.md:44-56`, `CommandReference.md:4`; `commands/` lacks them | new `commands/{capture,process,distribute,open-day,close-day,quick-dump,brain-dump,save,ingest-url,create-domain}.md` |
| P0-2 | **Route every workflow through `vaultPaths()` / a vault-root preflight.** Bare relative paths + `bun .claude/skills/…` + `2>/dev/null`-swallowed errors silently misbehave under the `$VAULT_DIR`≠`~/.claude` split (empty dashboard overwrites, phantom 2nd active week, snapshots scattered). | `Distribute.md:17,34`, `Process.md:9`, `WeekPrep.md:10-12`, `TaskSync.md:21-26` vs `ResolveRoot.ts:36-56` | all `Workflows/*.md` (both skills); a shared preflight + a `Tools/Snapshot.ts` |
| P0-3 | **Provision the external CLIs (`qmd`, `defuddle`, `obsidian`).** Load-bearing, unbundled; only qmd's install is documented, `obsidian`'s isn't, the installer wires none. Missing → dedup/cascade/search/authoring **silently degrade**. | `install.sh` (no refs); `QmdUpdate.ts:34-37`; `ObsidianCLI/SKILL.md:8` | `install.sh` doctor step; `ObsidianCLI/SKILL.md` prerequisites; surfaced warnings in qmd steps |
| P0-4 | **Installer ships no vault scaffold or `.obsidian/` config.** The Phase-4 scaffold exists at the *repo root* but is **not installed into the user's vault**, and no plugins (Bases/Tasks/Dataview) are enabled → nothing the journeys promise renders out-of-box. | repo-root `inbox/ domains/…` exist; bundle/installer don't deploy them; no `.obsidian/` anywhere | `install.sh`; new `.obsidian/{core-plugins,community-plugins}.json` (ties to Part Two Phase 9) |
| P0-5 | **Pin TaskSync source-tag casing + the `[Name]→PROJECT_NAME` transform.** Tag table emits `#[name]/[Name]` (lowercase dir) but schema/examples use `#Domain/ProjectName`; UpdateTasks routes by the tag → wrong path on a case-sensitive FS, push silently no-ops. | `TaskSync.md:44` vs `TaskSync.md:75-83` & `SKILL.md:62-67`; `UpdateTasks.md:28-32` | `TaskSync.md`, `UpdateTasks.md`, both SKILL schema blocks |
| P0-6 | **Fix broken Bases functions-reference link.** Links `FUNCTIONS_REFERENCE.md` (underscore) ×2; file is `FUNCTIONS-REFERENCE.md`. Progressive disclosure 404s. *One-line fix.* | `ObsidianBases/SKILL.md:177,497` | `ObsidianBases/SKILL.md` |

### P1 — high-value UX / data-integrity

| # | Finding | Evidence | Touches |
|---|---|---|---|
| P1-1 | **Make the dashboard a *live* Tasks/Dataview query, not static markdown.** Biggest Obsidian-UI lever — a Tasks query (`not done`, grouped by tag) never goes stale; current static aggregation needs manual `/task-sync`. | `TaskSync.md:48-87` (static); `WeekNote.md` frontmatter unused by any view | `TaskSync.md`; new `Templates/DashboardQuery.md`; `.obsidian` Tasks/Dataview |
| P1-2 | **Project a read-only view of PAI state into the vault.** Queue, ripple stubs, reflections live in `~/.claude`, invisible to the Obsidian-first user — mirror a `dashboards/_pai-state.md` or a Base. | `QueueUpdate.ts:39-42`; `KnowledgeRipple.ts:104-115`; `SKILL.md:61-63` | new `Tools/StateMirror.ts` + a `dashboards/` Base |
| P1-3 | **Unify timestamps on local `YYYY-MM-DD HH:MM AM/PM` everywhere.** OpenDay/CreateDomain/ContentLifecycle/AssetClasses/KnowledgeRipple emit ISO, violating the contract the linter enforces and breaking Bases/Dataview sorting. | `OpenDay.md:34,37`, `CreateDomain.md:26`; `KnowledgeRipple.ts:127` | those workflows + `KnowledgeRipple.ts` |
| P1-4 | **Protect hand-added & hand-edited dashboard tasks.** Untagged lines a user adds in Obsidian are silently dropped on push and erased on next pull; conflict detection relies on `last_updated` that Obsidian never bumps → genuine source edits overwritten. | `UpdateTasks.md:21-22,42-54`; `TaskSync.md:48-87` | `UpdateTasks.md`, `TaskSync.md` (preserve unrouted lines; content-hash diffing) |
| P1-5 | **Make the "SessionStart auto-`qmd update`" claim true or delete it.** No such hook exists → stale index, silent missed search results. | `Qmd/SKILL.md:57`; no qmd ref in `hooks/`/`settings.json` | `settings.json` SessionStart hook **or** `Qmd/SKILL.md:57` |
| P1-6 | **Reconcile reindex ordering + headless authoring fallback.** SKILL says `update && embed`; `/reindex` does embed-then-update → linkback can miss the just-created note. And authoring is `obsidian`-CLI-only (needs app open) with no documented "write `.md` to disk → `qmd update`" path. | `Qmd/SKILL.md:56-57` vs `commands/qmd/reindex.md`; `ObsidianCLI/SKILL.md:8` | `Qmd/SKILL.md`, `reindex.md`, `ObsidianMarkdown/SKILL.md` |
| P1-7 | **Co-editing concurrency guidance.** `obsidian append`/`property:set` can clobber a human's unsaved edits; no read-before-write / conflict convention. | `ObsidianCLI/SKILL.md:49-58` | `ObsidianCLI/SKILL.md` |

### P2 — robustness / polish

| # | Finding | Touches |
|---|---|---|
| P2-1 | **Add an Obsidian-side trigger surface** (Shell-commands plugin entries / `obsidian://` URI / dashboard buttons) so capture/process/week-prep fire from inside Obsidian. *Strategic deep fix for the core tension.* | new `References/ObsidianTriggers.md`; `install.sh` |
| P2-2 | **Let KnowledgeRipple stubs be re-classified.** Slug-only dedup freezes the first (often wrong) classification; surface confident mis-types, not just `pending`. | `KnowledgeRipple.ts:117`, `CloseDay.md:34` |
| P2-3 | **Improve ResolveDomain for sparse vaults.** The ≥2 wikilink-margin rule returns `unclear` for most early notes → constant manual routing. | `ResolveDomain.ts:87-100` |
| P2-4 | **Validate templates after write** (no residual `{{handlebars}}`) and **extend LintFrontmatter** with cross-note property-*type* consistency (breaks Bases filters) + ignore code blocks in the `[[ ]]` balance check. | `ProjectCreate.md`/`WeekPrep.md`; `LintFrontmatter.ts:126-142` |
| P2-5 | **Enforce single active week** (hard block + disambiguation) and **reconcile ISO-week vs archive `YYYY`** for year-boundary weeks. | `WeekPrep.md:8-17`, `WeekClose.md:87-93` |
| P2-6 | **Group `/brain-dump` output** (index note / shared MOC) so multi-marker dumps don't scatter N loose files. | `BrainDump.md` |
| P2-7 | **Ship a starter `bases/Domains.base`** (by `type`/tags) as the reference Obsidian-as-UI dashboard. | new `bases/Domains.base` |

---

## Recommendation

The journeys confirm the skills are a coherent *terminal-driven* system but not yet an
*Obsidian-driven* one. The highest-leverage work clusters into three moves, all already aligned with
Part Two:

1. **Close the invocation + path gaps (P0-1, P0-2, P0-5)** — without these the documented UX simply
   doesn't run, and the round-trip sync can corrupt data. These are the prerequisites to the fork
   being usable at all, independent of the Obsidian-UI ambition.
2. **Make the vault the surface (P0-4, P1-1, P1-2, P2-1, P2-7)** — install the scaffold + `.obsidian/`
   config, turn the dashboard into live Tasks/Dataview queries, project PAI state back into the vault,
   and add an in-Obsidian trigger. This *is* "Obsidian as primary UI," and it overlaps cleanly with
   **Part Two Phase 9** (and foreshadows the **Phase 11** vault-as-single-source bet — if memory
   moves into the vault, P1-2 stops being a mirror and becomes the source).
3. **Quick correctness wins (P0-6, P1-3, P1-5)** — the broken Bases link, the ISO/local timestamp
   split, and the false qmd-hook claim are cheap, high-confidence fixes worth doing immediately.

Suggested next action: fold the **P0 rows into `OBSIDIAN_FORK_BACKLOG.md`** as blockers for an
`obsidian-v1.1.0`, and slot the **P1 "make the vault the surface" cluster into Phase 9**.
