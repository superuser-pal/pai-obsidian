# pai-obsidian Audit Report — Phase 12 SecondBrain port

**Date:** 2026-06-10
**Branch audited:** `phase-12-secondbrain-port` (HEAD `616bda7`)
**Scope:** the port surface — SecondBrain, Qmd, ProjectManagement, DailyRituals, Obsidian* skills, `commands/`, root `bases/` — verified against `01-DOMAINS.md`, `02-INBOX.md`, `SECONDBRAIN_PORT_PLAN.md`, `OBSIDIAN_FORK_PLAN.md`.
**Method:** full static read of all 14 SecondBrain tools + 14 workflows + SKILL/References, supporting skills, and commands; then live execution of every tool against a seeded temp vault (`$VAULT_DIR`/`$PAI_DIR` split, deliberate violations) with bun 1.3.14. Every finding below marked **[tested]** was reproduced; the rest are from code/doc reading.

---

## 1. What's solid (verified working)

- `tsc --noEmit` clean on `SecondBrain/Tools` — plan claim holds. **[tested]**
- ValidateVault V1/V2a/V2b/V4 + LintFrontmatter F4/F5/F7 delegation all flag correctly; `--strict` exits 1. **[tested]**
- MapVault: Active Work table rebuild inside markers, rename proposals with inbound-ref counts, rename apply with lockstep `[[wikilink]]` rewrite (fs fallback works without git). **[tested]**
- KnowledgeRipple: typed entity upsert, person/company classification, vault-wide case-insensitive dedup, IngestLog events. **[tested]**
- SplitNote: 3-section split produces children with `synthesized-from`, bidirectional `## Related`, residual source with `synthesizes:`; children pass `--enforce` lint. **[tested]**
- AbsorbNote: snapshot → append → log → delete, atomically ordered. **[tested]**
- ArchiveDomain: active-content guard blocks (exit 2) and apply promotes `status: archived` + callout. **[tested]**
- LintFrontmatter: accepts both local `YYYY-MM-DD HH:MM AM/PM` and ISO (the F4 fix holds); `--enforce` exits 1 on warn. **[tested]**
- ListThinking stale marker, QueueUpdate add/complete, ResolveDomain frontmatter-first resolution. **[tested]**

The architecture decisions (advisory Option A, vault-as-source, `$VAULT_DIR`/`$PAI_DIR` split in the tools) are consistently executed *in the TypeScript layer*. The problems below are mostly at the seams: workflow docs, cross-skill conventions, and check-scoping.

---

## 2. Errors (severity-ranked)

### H1 — Workflows hardcode `.claude/...` relative paths, breaking the documented global-install mode
Every SecondBrain workflow invokes tools as `bun .claude/skills/...` and writes snapshots to `.claude/PAI/MEMORY/...` (Process.md, Distribute.md step a, Capture.md, BrainDump.md, Save.md, QuickDump.md, CreateDomain.md, OpenDay.md step 2). With the fork's flagship setup — `.claude/` installed globally to `~/.claude`, CWD = `$VAULT_DIR` — there is no `.claude/` under the vault, so every one of these invocations fails. The tools themselves resolve correctly via ResolveRoot; only the workflow *call sites* kept the repo==vault assumption the port plan explicitly removed (plan 3.5).
**Fix:** replace with `bun "$PAI_DIR/skills/..."` (default `~/.claude`) and `$PAI_DIR/PAI/MEMORY/...` everywhere in workflow docs. Also violates root CLAUDE.md rule "Never hardcode paths — use `${PAI_DIR}`".

### H2 — ExtractActions silently swallows bulleted `- [action]` items **[tested]**
`^\[action\]` only matches column-0 markers. The old-spec capture syntax (`02-INBOX.md` §2.1.2) is bulleted (`- [action] ...`), and Obsidian users naturally write list items. Tested result: `- [action] Bulleted action` was not extracted *and* was absorbed into the preceding action's body text — a silent task loss inside FR 2.3.4's path. `[Action]` (capitalized) also never extracts (but does terminate blocks, since the block-breaker `^\[\w+\]` is case-tolerant where the matcher isn't).
**Fix:** match `^(?:[-*]\s+)?\[action\]\s+`/i and use the same prefix-tolerant pattern as the block terminator.

### H3 — ValidateVault runs V3/V4 on `domains/Knowledge/`, flagging every entity note **[tested]**
The header comment and ValidateVault.md both say the special domain is "walked for frontmatter only," but V3 (orphan) and V4 (depth) are not gated on `special`. Ripple-created entity notes have no body wikilinks by design (`related:` lives in frontmatter, which the check strips) — so every entity KnowledgeRipple creates immediately produces a V3 warning. Tested: 2 entities → 2 warnings. `/validate-vault` output degrades linearly with knowledge-graph growth.
**Fix:** skip V3 (and arguably V4) for special domains, or count frontmatter `related:`/`seen_in:` links for entity notes.

### H4 — OpenDay daily template violates the fork's own frontmatter contract
`Workflows/OpenDay.md` step 5 writes `created: <ISO now>` and `discovered: <ISO now>` — the exact "ISO placeholder" bug class Phase 7.5 fixed in CreateDomain — and omits `status:` entirely (AssetClasses' Daily schema requires `status: processed`). Every `/open-day` note lands non-compliant in `plan/`; F7a fires on any lint pass.
**Fix:** `date +"%Y-%m-%d %I:%M %p"` + `status: processed`, matching AssetClasses §Daily.

### H5 — No user confirmation before the Distribute move (FR 2.3.2 gap)
Old-spec §2.3.2: "the user must confirm before any files are moved." Distribute.md resolves the domain and immediately `git mv`s — confirmation gates exist for cascade, actions, split, and absorb, but not for the move itself (only `UNCLEAR` prompts). Given the fork's cascade philosophy (confirm everything that touches user content), this is an inconsistency as well as an FR gap.
**Fix:** present the routing plan (file → `domains/<T>/02_PAGES/`) and confirm batch or per-file before moving.

### M1 — V3/orphan checks flag project files **[tested]**
Only `INDEX.md`/`AD_HOC_TASKS.md` are exempt from V3 and MapVault's orphan report. `PROJECT_*.md` files are task lists that legitimately carry no wikilinks: tested vault flagged `PROJECT_SHIP_IT.md` as both a ValidateVault V3 orphan and a MapVault true orphan (until the Active Work rebuild itself creates the inbound link). LintFrontmatter exempts PM files; the V3 layer should too.

### M2 — ResolveDomain returns nonexistent domains unchecked **[tested]**
`domain: GhostDomain` in frontmatter resolves to `target: GhostDomain` with no existence check; Distribute step c would then `git mv` into a nonexistent `domains/GhostDomain/02_PAGES/`. **Fix:** validate target against `domains/` and downgrade to `unclear` (or offer `/create-domain`) when missing.

### M3 — Distribute rollback leaves inconsistent frontmatter
Step c edits frontmatter (`status: processed`, `distributed:`) *before* `git mv`; the enforce-fail path rolls back only the mv. A held file sits in `inbox/ready/` already stamped `status: processed` — wrong queue state for the Inbox.base "Ready" view and the next run. **Fix:** roll back the frontmatter promotion too, or move first / edit after with full rollback.

### M4 — FR 2.3.3 (wikilink addition on distribute) not implemented
Old spec: the distributed note gains links to the domain INDEX and mentioned entities. Distribute adds neither — the cascade preview edits *other* pages, and ripple only reads links that already exist. Result: notes distributed without any wikilinks are immediately V3 orphans. **Fix:** offer (confirmed) insertion of `[[<Domain>/INDEX]]` + qmd-matched entity links into the note before ripple.

### M5 — Task source-tag conventions diverge between Distribute and ProjectManagement
Distribute step e writes `#<t>/<NAME>` with the domain **lowercased**; ProjectManagement's TaskSync table and TASKS.md schema use `#[name]/[Name]` / `#Domain/ProjectName` (domain as-is). UpdateTasks routes edits by exact tag — case divergence breaks round-tripping or duplicates tags when TaskSync re-tags aggregated lines. Distribute.md claims it "matches TaskSync's tag convention"; it doesn't. **Fix:** pick one canonical form (suggest: domain folder name verbatim) and state it in both skills.

### M6 — Two daily/weekly-note schemas collide with the lint contract **[tested]**
DailyRituals `Templates/DailyNote.md`: `type: daily` (lowercase, vs SecondBrain's `Daily`), no `status:` → F7a. `Templates/WeekNote.md`: `status: planning` → tested F7b warn on `plan/` files (`planning` is the PM enum, not the lifecycle enum, and the PM exemption is path-based and doesn't cover `plan/`). Three note systems (SecondBrain OpenDay, DailyRituals, ProjectManagement) currently share folders but not schemas. **Fix:** either align templates with the lifecycle enum, or extend the linter's exemption model from path-only to type-aware (`type: week|daily` exempt like PM files).

### M7 — DetectThinking S1 never fires for Obsidian-native tags **[tested]**
`fmTags` parses only inline `tags: [a, b]`; Obsidian's Properties editor writes block lists (`tags:\n  - thinking`), tested → `tag_thinking: false`. The same inline-only assumption sits in ResolveDomain's tag match (strategy 3). **Fix:** share LintFrontmatter's block-list-aware parser (see also M11).

### M8 — MapVault renames are all-or-nothing (FR 1.3.2 degraded)
`--apply-renames` applies every proposal; the workflow honestly documents that per-rename confirmation only works if the user accepts *all* proposals — one "n" and nothing can be applied. **Fix (already noted as deferred in MapVault.md):** `--only <from>` flag or confirmed-list file.

### M9 — ActiveWork.base filter syntax not covered by the fork's own Bases reference
`'or(status == "planning", status == "active")'` — the ObsidianBases SKILL.md documents nested `and:`/`or:` keys, and FUNCTIONS-REFERENCE.md lists no `or()` function. If Obsidian rejects it, the Base silently shows wrong/no results. **Fix:** nest the `or:` block; verify all three .base files render in Obsidian (Bases rendering isn't covered by the plan's verification harness).

### M10 — Entity-type vocabulary is split and the inheritance path is dead
Content notes use plural-capitalized types (`People|Companies|Ideas|Research|Note|Daily` — SKILL.md contract, AssetClasses) while entity notes use lowercase singular (`person|company|idea|research`). KnowledgeRipple's classify() inherits from the source note's `type:` only if the lowercased value is in the *singular* set — so the documented `type: Ideas` never matches (only `Research`→`research` happens to). Cosmetic until someone relies on the documented heuristic. **Fix:** map plural→singular in classify(); document the two-vocabulary rule in one place.

### M11 — Six pre-existing `tsc` strict errors in LintFrontmatter.ts **[tested]**
`bunx tsc --noEmit` in `Qmd/Tools` → 6 errors (lines 70–78, undefined-index/possibly-undefined). Runtime is fine under bun, but ValidateVault explicitly spawns a subprocess per file *because* importing is "risky" — fixing the types unlocks direct import and removes a process-per-file hot path (see P1).

### M12 — Single-file/page archive workflow missing (FR 1.4.1)
Only projects have `/project-archive`. Pages have no archive path — ListThinking's own help text tells users to hand-move files to `03_ARCHIVE/` and hand-set `status: archived`. Old-spec 1.4.1 wanted deprecation header + `git mv` for any file. **Fix:** a small `/page-archive <path>` (or extend `/project-archive`).

---

## 3. Low-severity / polish

- **L1** — AbsorbNote snapshot filenames use *local* time components with a `Z` (UTC) suffix — mislabeled timestamps in `secondbrain-snapshots/`.
- **L2** — SplitNote: header comment claims it rewrites `type:` → `Note` (it doesn't); `title:` written unquoted (a colon in a section heading produces invalid YAML); a mid-batch `child already exists` throw leaves earlier children written with the source unrewritten (duplicated content until manual cleanup).
- **L3** — Absorbed content keeps the source's `# H1` inside the target page (heading-level collision); consider demoting headings on absorb.
- **L4** — F4 validates `created/modified/discovered` but not `last_updated` or `date` — the two fields the rituals/PM layers lean on most.
- **L5** — dashboards MOC notes (anything but TASKS.md) get F7a noise **[tested]** — `dashboards/` arguably isn't lifecycle content.
- **L6** — A misnamed project file (`myBadProject.md`) loses the path-based PM exemption and draws F7b (`planning` invalid) *on top of* V2a — confusing double report for one root cause. **[tested]**
- **L7** — ListThinking ignores the `status:` filter (old-spec 2.2.0b scoped to `status: thinking`) and is non-recursive — `thinking/` subfolders (Council/RedTeam outputs per vault conventions) are invisible.
- **L8** — MapVault/backlink matching is exact-stem: `[[Display Name]]` doesn't credit `display-name.md` → false orphans; same root cause as the known Phase 11 KnowledgeGraph wikilink-edge gap (still open).
- **L9** — QuickDump snapshots *after* write+ripple (step 8) while Distribute snapshots first — inconsistent recovery semantics; QuickDump's enforce-fail path deletes "the only authoritative copy" before any snapshot exists.
- **L10** — `Inbox.base` includes `processed`/`archived` views — useful, but the name undersells it (it's a lifecycle base); minor naming/UX.
- **L11** — Capture.md heading says "10-category observation taxonomy" above an 18-row table.
- **L12** — ExtractActions/`[action]` matching is case-sensitive while the block terminator isn't (subset of H2).

### Doc drift

- **D1** — `SECONDBRAIN_PORT_PLAN.md` header still reads "Status: PLANNED — not started" though phases 1–8 shipped (commits `1e48a18`…`616bda7`). Update or future sessions may re-execute it.
- **D2** — SecondBrain SKILL.md: frontmatter-contract `type:` enum omits the entity vocabulary (see M10); "`type` drives classification in ResolveDomain.ts" — ResolveDomain never reads `type`; Tools table still describes ResolveRoot as a "`git rev-parse` helper" (pre-split description). AssetClasses repeats the ResolveDomain claim.
- **D3** — ValidateVault.md describes Knowledge as exempt from checks the code still runs (H3's doc half).
- **D4** — Phase 11 deferred follow-ups remain open and untracked anywhere except the plan: Pulse "Blogs"→"Research" relabel, KnowledgeGraph wikilink-slug normalization, PAI/DOCUMENTATION `_harvest-queue` lore.
- **D5** — Untracked `.claude/` directory at repo root (visible in `git status`) — likely local session state; add to root `.gitignore` to avoid accidental commits.

### Performance

- **P1** — ValidateVault spawns one `bun` process per markdown file to run the linter (`runLinterJson`). On a thousand-note vault that's a thousand process launches per `/validate-vault`. Fix M11, then import `lintFile()` directly.

---

## 4. Functional-requirements coverage matrix

Status legend: ✅ met · 🟡 partial / modified (deliberate fork divergence noted) · ❌ gap · ⛔ deliberately not ported (documented decision).

### 01-DOMAINS.md

| FR | Requirement | Status | Evidence / notes |
|---|---|---|---|
| 1.1.1 | Domain skeleton on create | ✅ | CreateDomain.md; CONNECTIONS.yaml ⛔ dropped (plan §7.4, superseded by Bases + `related:`) |
| 1.1.2 | kebab-case domain names | 🟡 | Superseded: PascalCase is the fork convention (plan §122); V2c validates it **[tested]** |
| 1.1.3 | INDEX as MOC (fm: name/description/status/last_updated; Current State; Active Work; links) | 🟡 | Sections + markers + external-link prompt shipped; frontmatter uses `title/domain/created`, no `description/last_updated` |
| 1.1.4 | Register domain in CLAUDE.md | ⛔ | Heuristic-only decision, documented 2026-06-10 |
| 1.2.1 | Structure completeness check | ✅ | V1 **[tested]** (missing INDEX + 03_ARCHIVE both flagged) |
| 1.2.2 | Naming enforcement | ✅ | V2a/V2b **[tested]** |
| 1.2.3 | Wikilink requirement / orphans | 🟡 | Works **[tested]** but over-broad: entity + project false positives (H3, M1) |
| 1.2.4 | Depth ≤ 3 | ✅ | V4 **[tested]** |
| 1.3.1 | Active Work table rebuild | ✅ | MapVault `--apply` **[tested]** |
| 1.3.2 | Confirmed naming auto-fix via git mv | 🟡 | Rename + inbound rewrite work **[tested]**; batch is all-or-nothing (M8) |
| 1.3.3 | True-orphan detection (in+out) | 🟡 | Works **[tested]**; exact-stem matching → false orphans (L8), project noise (M1) |
| 1.4.1 | Single-file archive w/ deprecation header | ❌ | Projects only; no page archive (M12) |
| 1.4.2 | Domain archive (status, date, reason) | ✅ | **[tested]**; notice is a top-of-body callout rather than inside Current State |
| 1.4.3 | Active-content protection | ✅ | Guard blocks, exit 2 **[tested]** |
| 1.5.1–1.5.2 | PostToolUse schema hooks | ⛔ | Option A (advisory); validators written hook-promotable as planned |

### 02-INBOX.md

| FR | Requirement | Status | Evidence / notes |
|---|---|---|---|
| 2.1.0 | Initial `status:` on capture | ✅ | Capture/BrainDump write `unprocessed`/`thinking` |
| 2.1.1 | Raw capture, minimal fm | 🟡 | Shipped; fields differ (fork: status/source/discovered/tags — old spec's `date`+`created` not written until /process) |
| 2.1.2 | Observation categories | 🟡 | 18-category union documented; syntax is column-0 `[cat]`, old spec's `- [cat]` form breaks extraction (H2) |
| 2.1.3 | URL capture via defuddle | ✅ | Capture.md / IngestUrl.md, graceful degradation documented |
| 2.1.4 | Raw minimal schema validation | 🟡 | Re-shaped: F7 requires `status:` even in raw; `date/created` not required (F3 info only) |
| 2.2.0 | Thinking routing offer in /process | ✅ | DetectThinking + confirmed offer; S1 tag signal dead for block-style tags (M7) |
| 2.2.0b | Passive thinking reminder | ✅ | ListThinking **[tested]**; no status filter, non-recursive (L7) |
| 2.2.1 | Scan + classify | ✅ | Heuristic (no CLAUDE.md signals — ⛔ per §7.1 decision) |
| 2.2.2 | Full frontmatter generation | 🟡 | Fork contract drops `name/domain/origin/description`; quoted-date rule not enforced |
| 2.2.3 | Move to ready, status promoted | ✅ | Process.md, enforce-linted, held-file semantics defined |
| 2.2.4 | Domain confirmation on low confidence | ✅ | `UNCLEAR` → prompt; but nonexistent-domain case bypasses it (M2) |
| 2.3.1 | Route by domain | ✅ | ResolveDomain → move; M2 caveat |
| 2.3.2 | User confirmation before moving | ❌ | No confirm gate on the move itself (H5) |
| 2.3.3 | Wikilink addition on distribute | ❌ | Not implemented; cascade is the reverse direction (M4) |
| 2.3.4 | Action extraction → tasks | 🟡 | Bare `[action]` works, confirmed per action, TaskSync hookup defined; bulleted form silently lost (H2); tag-case mismatch (M5) |
| 2.3.5 | status: processed; source retained | 🟡 | Status ✅; "retained for provenance" replaced by $PAI_DIR snapshot (deliberate, documented) |
| 2.3.6 | Split promotion | ✅ | **[tested]** — synthesized-from, bidirectional Related, source processed |
| 2.3.7 | Absorb promotion | 🟡 | **[tested]** atomic absorb; fork snapshot dir replaces MASTER_ARCHIVE (deliberate); target-section choice simplified to an appended `## Absorbed from` heading |
| 2.3.8 | Status enum validation | ✅ | F7a/F7b **[tested]** both directions |

**Score:** of 34 FRs — 17 ✅, 12 🟡, 3 ❌ (2.3.2, 2.3.3, 1.4.1), 2 ⛔ deliberate (counting 1.5.x as one).

---

## 5. Backlog (ready to file)

Priority: P0 = breaks documented flows or loses data · P1 = correctness/noise in common paths · P2 = polish, docs, UX.

| ID | P | Item | Refs | Effort |
|---|---|---|---|---|
| BL-01 | P0 | Replace `.claude/...` with `$PAI_DIR/...` in all workflow tool invocations + runtime paths | H1 | S–M (mechanical, ~8 files) |
| BL-02 | P0 | ExtractActions: bullet-tolerant + case-insensitive `[action]` matching and block termination | H2 | S |
| BL-03 | P0 | Gate V3/V4 off for special domains (Knowledge); exempt PROJECT_*.md from V3/orphan reports | H3, M1 | S |
| BL-04 | P0 | OpenDay template: local timestamps + `status: processed` | H4 | S |
| BL-05 | P1 | Add routing-plan confirmation before the Distribute move | H5 | S |
| BL-06 | P1 | ResolveDomain: verify frontmatter target exists; else `unclear` + offer create-domain | M2 | S |
| BL-07 | P1 | Distribute hold-path: roll back frontmatter promotion with the mv | M3 | S |
| BL-08 | P1 | Confirmed wikilink insertion (domain INDEX + entities) into distributed notes | M4 | M |
| BL-09 | P1 | Unify task source-tag casing across Distribute / TaskSync / UpdateTasks; document in both skills | M5 | S |
| BL-10 | P1 | Reconcile DailyRituals templates with the lint contract (or type-aware lint exemptions for `week/daily`) | M6 | M |
| BL-11 | P1 | Shared block-list-aware frontmatter parser (one module) for DetectThinking, ResolveDomain, ripple, MapVault | M7 | M |
| BL-12 | P1 | Verify all three `.base` files in real Obsidian; fix `or(...)` filter if rejected | M9 | S |
| BL-13 | P1 | Fix LintFrontmatter tsc errors → import lintFile() in ValidateVault (kills process-per-file) | M11, P1 | S–M |
| BL-14 | P1 | `--only` flag for MapVault renames (true per-rename confirmation) | M8 | S |
| BL-15 | P1 | Page-level archive workflow (deprecation header + git mv to 03_ARCHIVE) | M12 | M |
| BL-16 | P2 | Map plural→singular type inheritance in KnowledgeRipple.classify; document the two type vocabularies | M10 | S |
| BL-17 | P2 | F4 coverage for `last_updated`/`date`; decide dashboards/`plan/` lint scope | L4, L5 | S |
| BL-18 | P2 | SplitNote: quote `title:`, fix stale comment, pre-check all child paths before writing any | L2 | S |
| BL-19 | P2 | Absorb: demote source headings; fix snapshot timestamp Z-suffix | L1, L3 | S |
| BL-20 | P2 | ListThinking: recurse + filter `status: thinking` | L7 | S |
| BL-21 | P2 | Normalize wikilink↔slug matching (fixes L8 + the open Phase 11 KnowledgeGraph edge gap) | L8, D4 | M |
| BL-22 | P2 | QuickDump: snapshot before write (align with Distribute) | L9 | S |
| BL-23 | P2 | Doc sweep: plan header status, SKILL.md stale claims (ResolveRoot/ResolveDomain/type enum), ValidateVault.md Knowledge wording, Capture "10-category" heading | D1–D3, L11 | S |
| BL-24 | P2 | Track Phase 11 leftovers as real backlog items (Pulse relabel, DOCUMENTATION lore) | D4 | — |
| BL-25 | P2 | gitignore the root `.claude/`; consider `plan/` daily filename `YYYY-MM-DD` for sort order | D5, UX | S |

### Suggested sequencing

1. **BL-01–BL-04** (one short session — all small, and H1 blocks real-world use of everything else).
2. **BL-05–BL-09** (pipeline correctness; do BL-06/07 together since both touch Distribute step c).
3. **BL-11 + BL-13** (shared parser + linter import — refactor pass that shrinks four tools).
4. **BL-12 in Obsidian** before relying on Bases views anywhere else (Phase 9 depends on it).
5. The P2 batch opportunistically, ideally BL-23 first so future sessions don't act on stale plans.

---

## 6. Experience improvements (beyond fixes)

- **Split-offer fatigue:** any well-structured page with ≥3 `##` sections triggers the split offer on every distribute. Consider skipping the offer when the note carries `synthesizes:`/`synthesized-from:` or a `split-considered: true` marker after the first decline.
- **`/validate-vault` signal-to-noise:** after BL-03, consider a `--changed-since <ref>` mode so weekly hygiene runs only surface deltas.
- **Inbox.base:** rename to `Lifecycle.base` (or split a true inbox-only view) — current name hides that processed/archived views live there.
- **Daily-note ownership:** decide whether `/open-day` (SecondBrain) or DailyRituals owns the daily note shape and make the other defer; right now the two templates would write different schemas into the same `plan/` folder.
- **Onboarding check:** a `/doctor`-style command (bun present, `$VAULT_DIR` set, qmd installed, Obsidian plugins) would catch the H1 class of issue at install time — fits Phase 10's installer work.
