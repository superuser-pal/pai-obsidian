# SecondBrain Port Plan — recover old-spec governance on the new entity-graph fork

**Created:** 2026-06-09
**Status:** PLANNED — not started. Execute in a later session.
**Working branch when written:** `phase-11-vault-as-source` (cut a fresh branch off `main`/`obsidian-edition` to execute).

---

## Why this plan exists

Two requirement docs from the operator's previous Second Brain were dropped into the repo root:
[01-DOMAINS.md](01-DOMAINS.md) and [02-INBOX.md](02-INBOX.md). A full comparison against the
current pai-obsidian fork surfaced ten capabilities the old spec required that the fork does **not**
do, plus four high-value ports. This plan turns those into executable phases.

### The two philosophies (keep both in mind while executing)

- **Old spec:** *enforced + registered + page-centric.* Every note carries a `status:` enum, hooks
  hard-validate schemas, domains are registered in CLAUDE.md with detection signals, distribute has
  Split/Absorb/Action-extraction. The wiki **is** the set of domain pages.
- **Current fork:** *advisory + heuristic + entity-graph.* Frontmatter lint is advisory (invariant
  i2, never blocks), domain detection is heuristic (`ResolveDomain` wikilink margin), and — post
  Phase 11 — a **typed entity graph** (`domains/Knowledge/` + `bases/Knowledge.base`, types
  person|company|idea|research) is built automatically from `[[entities]]`.

**Goal of this plan:** keep the fork's entity graph and advisory ergonomics, but recover the
governance/discipline the operator valued. The two are reconcilable.

### Key fork files this plan touches (verified 2026-06-09)

| Concern | File(s) |
|---|---|
| Frontmatter contract | `Releases/v5.0.0/.claude/skills/SecondBrain/SKILL.md` (`## Frontmatter contract`) |
| Advisory lint | `Releases/v5.0.0/.claude/skills/Qmd/Tools/LintFrontmatter.ts` |
| Pipeline workflows | `Releases/v5.0.0/.claude/skills/SecondBrain/Workflows/{Process,Distribute,CreateDomain,Save,QuickDump,BrainDump,Capture}.md` |
| Queue state (out-of-band status) | `Releases/v5.0.0/.claude/skills/SecondBrain/Tools/QueueUpdate.ts` |
| Domain routing (heuristic) | `Releases/v5.0.0/.claude/skills/SecondBrain/Tools/ResolveDomain.ts` |
| Commands | `Releases/v5.0.0/.claude/commands/secondbrain/`, `.../commands/manage/` |
| Tasks | `ProjectManagement` skill + `dashboards/TASKS.md` |
| Entity graph (Phase 11) | `domains/Knowledge/`, `bases/Knowledge.base`, `KnowledgeRipple.ts` |

### Process constraint

Editing any `SKILL.md` frontmatter or adding/removing Workflows/Tools/References routes through the
`CreateSkill` skill per `skills/CLAUDE.md` **when operating an installed PAI**. When editing this
release bundle as source (as in the Phase 11 work), direct edits are appropriate — but keep changes
faithful to the canonical skill format and re-run `tsc`/`bun build` on any touched tool.

---

## Cross-cutting decision to make FIRST

Before executing, decide the **enforcement stance**, because it shapes Phases 1–3:

- **Option A — Advisory (matches fork):** add `status:` + validators, but keep them
  advisory/non-blocking (warnings only). Lowest friction, consistent with invariant i2.
- **Option B — Enforced (matches old spec):** wire a PostToolUse hook that hard-warns (or blocks)
  on schema/status/naming violations. Closer to the old experience; more friction; touches
  `settings.json` hooks.
- **Recommendation:** **A** for the fork's public default, with the validators *written so they
  can be promoted to a hook later* (pure functions, exit codes). Revisit B in the operator's
  private fork.

---

## Phase 1 — Reintroduce the `status:` lifecycle  *(highest-value, lowest-risk)*

**Old spec:** `02-INBOX.md` §2.1.0, §2.2.3, §2.3.5, §2.3.8 — canonical enum
`unprocessed | thinking | ready | processed | archived`, set at each stage, validated.

**Current state:** no `status:` field anywhere. Pipeline state lives out-of-band in
`QueueUpdate.ts` (pending/complete), invisible in the note.

**Why first:** restores at-a-glance lifecycle visibility (open a note / filter a Base by status)
without touching the heuristic or entity-graph machinery.

**Changes:**
1. Add `status:` to the frontmatter contract in `SecondBrain/SKILL.md` (`## Frontmatter contract`),
   documenting the enum and the stage→value mapping.
2. Set it in the workflows:
   - `Capture.md` / `BrainDump.md` → `status: unprocessed` (or `thinking` for `--thinking`).
   - `Process.md` → promote `unprocessed → ready` on raw→ready move.
   - `Distribute.md` → set `status: processed` when a page lands in `02_PAGES/`.
3. Add `status` to `LintFrontmatter.ts` as an **advisory** enum check (Option A).
4. Add a `status` column/filter to a Base (extend `Knowledge.base` or add `bases/Inbox.base`).

**Decisions:** keep QueueUpdate too (belt-and-suspenders) or let `status:` supersede it?
Recommendation: keep QueueUpdate as the machine-readable queue; `status:` is the human-readable
mirror. Document that Distribute updates both.

**Verification:** run capture→process→distribute on a test note; confirm status transitions
`unprocessed → ready → processed`; confirm lint warns on a bad value; confirm the Base filters by it.

---

## Phase 2 — `validate-vault` workflow (domain hygiene)

**Old spec:** `01-DOMAINS.md` §1.2.1–1.2.4 (`validate-domain`) — structure completeness, naming
enforcement (`PROJECT_UPPER_SNAKE`, kebab pages), wikilink requirement (orphans flagged),
nesting-depth ≤ 3.

**Current state:** none of these exist for domain pages. (Only `KnowledgeHarvester status` reports
orphan wikilinks among *entity* notes.)

**Changes:**
1. New tool `skills/SecondBrain/Tools/ValidateVault.ts` that, given `$VAULT_DIR`, checks per domain:
   - skeleton present (`INDEX.md, 01_PROJECTS/, 02_PAGES/, 03_ARCHIVE/`),
   - naming (`01_PROJECTS/PROJECT_*.md` upper-snake; `02_PAGES/*.md` kebab),
   - every note has ≥1 wikilink (orphan flag),
   - folder depth ≤ 3 below domain root,
   - frontmatter present + (advisory) status enum valid.
2. New workflow `Workflows/ValidateVault.md` + command `commands/manage/validate-vault.md`.
3. Output a report; **advisory** (Option A) — no auto-fix here (that's Phase 3).

**Decisions:** reuse `ResolveRoot.vaultPaths()` for paths; emit machine-readable JSON + a human
summary. Reconcile naming rules with the fork (domains are **PascalCase**, old spec was kebab — keep
PascalCase, validate pages as kebab).

**Verification:** seed a domain with a missing subfolder, a wrongly-named project file, an orphan
note, and a 4-deep folder; confirm each is flagged; confirm `tsc`/`bun build` clean.

---

## Phase 3 — `map-vault` workflow (INDEX refresh + naming auto-fix)

**Old spec:** `01-DOMAINS.md` §1.3.1–1.3.3 (`map-domain`) — rebuild INDEX **Active Work table**
from project frontmatter, **naming auto-fix** (proposed `git mv`, user-confirmed), orphan detection.

**Current state:** none. The fork's `CreateDomain` INDEX has prose Projects/Pages/Archive sections,
no Active-Work table rebuilt from data.

**Changes:**
1. Extend `ValidateVault.ts` (or a sibling `MapVault.ts`) to:
   - rebuild each domain `INDEX.md` "Active Work" table from `01_PROJECTS/*` frontmatter
     (name, status, last_updated),
   - propose naming fixes as **confirmed `git mv`** (never auto-apply — matches old §1.3.2 and the
     fork's cascade philosophy),
   - report orphans (zero inbound + outbound links).
2. Workflow `Workflows/MapVault.md` + command `commands/manage/map-vault.md`.
3. Add an "Active Work" section to the `CreateDomain` INDEX template so the table has a home.

**Decisions:** Active-Work table could also be a `bases/` view instead of a rebuilt markdown table
(more Obsidian-native, never stale). **Recommendation:** ship a `bases/ActiveWork.base` AND keep a
lightweight INDEX table for non-Bases users — decide at execution.

**Verification:** add a project file, run map; confirm INDEX table updates; rename a violating file
via the confirmed `git mv`; confirm orphan report.

---

## Phase 4 — Distribute: Action extraction → tasks

**Old spec:** `02-INBOX.md` §2.3.4 — distributed notes with `[action]` observations offer to create
tasks in the relevant project file.

**Current state:** `Distribute.md` has cascade + idempotency but no action extraction. The fork
*does* have a task system (`ProjectManagement` skill + `dashboards/TASKS.md`, Obsidian Tasks-compatible)
— it's just not wired into distribute.

**Changes:**
1. In `Distribute.md`, after the move, scan the page for `[action]` / `[todo]` lines.
2. Offer (confirmed) to append them as Tasks-plugin checkboxes to the domain's
   `01_PROJECTS/<project>.md` (or `dashboards/TASKS.md`) with a `#Domain/Project` source tag.
3. Reuse `ProjectManagement`'s `task-add` / `task-sync` rather than reinventing.

**Decisions:** route to the project file (old behavior) vs. straight to `dashboards/TASKS.md`
(fork-native). Recommendation: project file is the source of truth; `task-sync` aggregates to the
dashboard — matches the fork's existing bidirectional model.

**Verification:** distribute a note containing `[action] ship the thing`; confirm a confirmed task
lands in the project file and shows in `dashboards/TASKS.md` after sync.

---

## Phase 5 — Distribute: Split + Absorb promotions

**Old spec:** `02-INBOX.md` §2.3.6 (Split: multi-topic note → separate pages with
`synthesized-from:` + bidirectional `## Related` links) and §2.3.7 (Absorb: dedupe into existing
page, copy source to archive, delete original, log).

**Current state:** the fork's distribute idempotency offers replace/merge/keep-both, and `Save.md`
does a `qmd` dedup check (≥80% → prompt) — that's *half* of Absorb. No Split.

**Changes:**
1. **Absorb:** formalize the existing dedup path — when `qmd vsearch` finds a near-duplicate target,
   present (a) target title, (b) exact appended content, (c) section; on confirm, snapshot source to
   `$PAI_DIR/.../secondbrain-snapshots/`, append to target, log to IngestLog, remove source.
   (Fork uses snapshot+IngestLog rather than the old `brain/MASTER_ARCHIVE/` + `INGEST_LOG.md`.)
2. **Split:** detect 3+ independently page-worthy topics; offer to split into pages each carrying
   `synthesized-from: ["[[source]]"]` + bidirectional `## Related` links; source gets `status: processed`.
3. Both stay confirmation-gated (cascade philosophy / plan §13 R7).

**Decisions:** Split detection heuristic (heading count? topic-shift via qmd?) — keep simple +
confirmed. Absorb's archive location: reuse the fork's snapshot dir, not a new `MASTER_ARCHIVE/`.

**Verification:** a 3-topic note offers Split; a near-duplicate note offers Absorb with the exact
diff; both log correctly.

---

## Phase 6 — Thinking/ lifecycle in Process

**Old spec:** `02-INBOX.md` §2.2.0 (process offers to move reasoning/scratchpad/open-question
content to `thinking/` with `status: thinking`) and §2.2.0b (passive reminder listing `thinking/`
notes with last_updated + promote/archive instructions, no interactive prompt).

**Current state:** `thinking/` exists as a folder ("never auto-routed"); `/capture --thinking`
writes there; but `/process` neither offers thinking-routing nor shows a reminder.

**Changes:**
1. `Process.md`: when a raw note is primarily reasoning/scratchpad/open-question, **offer**
   (confirmed) to route to `thinking/` with `status: thinking` instead of `inbox/ready/`.
2. `Process.md`: after processing, emit a **passive reminder** block listing `thinking/` notes with
   `last_updated`, with promote/archive instructions — no interactive prompt.

**Decisions:** ties to Phase 1's `status:` enum (`thinking` value). Do Phase 1 first.

**Verification:** a reasoning-heavy raw note triggers the thinking offer; a stale `thinking/` note
appears in the reminder block.

---

## Phase 7 — Domain governance polish  *(lower priority)*

Bundle the remaining `01-DOMAINS.md` gaps:

1. **§1.1.4 Domain registration** — decide: register domains in root `CLAUDE.md` with scope +
   detection signals (old behavior, helps `ResolveDomain`), **or** keep heuristic-only. If adopting,
   have `CreateDomain` append a registry row and feed signals into `ResolveDomain`.
2. **§1.1.3 INDEX as MOC** — richer INDEX template (Current State, Quick Links, ≥1 external wikilink).
3. **§1.4.1–1.4.3 Archiving** — a domain-level archive workflow with deprecation headers +
   **active-content protection** (prompt to move/cancel in-progress projects first). The fork has
   `project-archive` but no domain-level archive guard.
4. **§1.1.1 CONNECTIONS.yaml** — decide whether to reintroduce per-domain `CONNECTIONS.yaml`, or
   treat `related:`/wikilinks + Bases as the connection layer (recommended: **drop CONNECTIONS.yaml**,
   it's superseded by Bases + typed `related:`).
5. **Fix:** `CreateDomain` INDEX template uses `<ISO now>` placeholders — contradicts the fork's
   "local timestamp, never ISO" contract. One-line fix to `date +"%Y-%m-%d %I:%M %p"`.

**Decisions:** items 1 and 4 are genuine philosophy forks — resolve with the operator before building.

---

## Phase 8 — Capture vocabulary reconciliation  *(optional)*

**Old spec:** `02-INBOX.md` §2.1.2 categories `[fact] [idea] [decision] [technique] [requirement]
[question] [insight] [problem] [solution] [action]`.
**Fork:** `BrainDump` categories `idea, observation, todo, question, note, bookmark, quote, decision,
risk, learning, gripe`.

**Change:** reconcile into one documented set (union, or the operator's preferred subset). At minimum
ensure `[action]`/`[todo]` exist (Phase 4 depends on them). Low effort; do alongside Phase 4.

---

## Suggested execution order

```
Decide enforcement stance (A vs B)
        │
Phase 1 (status enum)  ──────────────┐  prerequisite for 6
        │                            │
Phase 2 (validate-vault)             │
        │                            │
Phase 3 (map-vault) ── needs 2       │
        │                            │
Phase 4 (action extraction) ── needs Phase 8 categories
        │
Phase 5 (split / absorb)
        │
Phase 6 (thinking lifecycle) ── needs Phase 1
        │
Phase 7 (domain governance polish)   ← resolve philosophy forks first
Phase 8 (capture vocabulary)         ← do alongside Phase 4
```

Phases 1–4 are the high-value core. 5–8 are depth/polish.

---

## Gaps NOT being ported (and why)

- **Hard PostToolUse validation hooks (old §1.5, §2.1.4, §2.3.8):** deferred to the enforcement
  decision (Option B); the fork's default is advisory. Validators are written hook-promotable.
- **`brain/MASTER_ARCHIVE/` + `brain/INGEST_LOG.md` exact paths:** superseded by the fork's
  `$PAI_DIR` snapshot dir + `IngestLog.jsonl`. Same intent, fork-native paths.
- **`CONNECTIONS.yaml`:** superseded by Bases + typed `related:` frontmatter (Phase 7 decision).

---

## Verification harness (run after each phase)

```bash
cd Releases/v5.0.0/.claude
# typed tools
( cd skills/SecondBrain/Tools && bunx tsc --noEmit )
# compile any touched tool
bun build <touched-tool>.ts --target=bun
# end-to-end: capture → process → distribute on a temp $VAULT_DIR, assert
# status transitions + entity upsert + (new) validate/map/action behaviors.
```

Reuse the Phase 11 smoke-test pattern (temp vault via `mktemp -d`, `VAULT_DIR=… bun …`).
