# pai-obsidian Fork Plan

Three-tier cascade: `danielmiessler/PAI` → `superuser-pal/pai-obsidian` (public) → `superuser-pal/pai-private` (personal brain).

---

## Phase 1 — Create the fork and wire the remotes

- [x] **1.1** Fork `danielmiessler/Personal_AI_Infrastructure` → `superuser-pal/pai-obsidian` ✅ 2026-06-06
- [x] **1.2** Clone locally to `~/Documents/GitHub/pai-obsidian` ✅ 2026-06-06
- [x] **1.3** Wire `upstream` remote → `danielmiessler/Personal_AI_Infrastructure` ✅ 2026-06-06
- [x] **1.4** Wire `obsidian` remote in private fork → `superuser-pal/pai-obsidian` ✅ 2026-06-06
- [x] **1.5** Create and push `obsidian-edition` working branch ✅ 2026-06-06

---

## Phase 2 — Release installer and root documentation

**Context:** `Packs/` stays intact as reference material. All active work targets
`Releases/v5.0.0/.claude/` — the installer users actually run. Current branch: `obsidian-edition`.

- [x] **2.1** Trim `Releases/v5.0.0/.claude/skills/` per backlog verdicts ✅ 2026-06-07
  Removed: `ArXiv`, `BrightData`, `Interceptor`, `PAIUpgrade`, `PrivateInvestigator`, `Remotion` → 39 skills remain.
- [x] **2.2** Merge `chore/archive-purge` → `obsidian-edition` (fast-forward) ✅ 2026-06-07
- [x] **2.3** Create root `CLAUDE.md` — the fork's operational identity for Claude Code. ✅ 2026-06-08
  Fork identity block, installation pointer, 39-skill table grouped by category (Thinking/Research/Knowledge/Creative/Dev/Obsidian), vault conventions stub, 3 operational rules. No @-imports.

- [x] **2.4** Rewrite `README.md` — Obsidian fork identity, three-tier Mermaid diagram, quick-start install steps. ✅ 2026-06-08

- [x] **2.5** Delete `PLATFORM.md` — upstream architecture doc, not fork-relevant. ✅ 2026-06-08

- [x] **2.6** Trim `SECURITY.md` — replaced PAI_DIRECTORY warning with pai-obsidian/pai-private separation model; kept prompt injection guidance. ✅ 2026-06-08

**Note — PRs 2+3 from backlog cancelled:** `Packs/` stays intact as the reference catalog. The 39 skills already in `Releases/v5.0.0/.claude/skills/` (trimmed in Phase 2.1) are the definitive installed set. Users browse `Packs/` to optionally install more.

**Note — local install deferred:** Install currently targets `~/.claude/` (global). Changing to project-local install is a breaking change — deferred to a later phase with proper testing. Requires modifying `install.sh`.

---

## Phase 3 — Port the 7 Obsidian skills from private fork

**Source:** `~/Documents/GitHub/Personal_AI_Infrastructure/.claude/skills/<Skill>/`
**Destination:** `Releases/v5.0.0/.claude/skills/<Skill>/` (adds to the installer)

### Pre-flight analysis findings (2026-06-08)

Audited all 7 source skills before porting. Key conclusions:

- **Sanitization is a near no-op.** Swept all 7 skills: **zero** real personal-identifier
  hits. The single `/Users/` match is a code comment *forbidding* hardcoded paths. The
  skills were written path-agnostic (git-root-relative). Keep the audit step, but expect it
  clean every time.
- **The vault-location model is the one real architectural decision** — resolved below.
- **`qmd` is an unbundled external CLI** (v2.1.0, `bun install -g qmd`) — shipped as a
  documented prerequisite, not added to `install.sh`.
- **The harvest pipeline already exists in the dest** (`PAI/TOOLS/KnowledgeHarvester.ts`),
  so KnowledgeRipple stubs will be consumed. No gap there.
- **Missing `MEMORY/` subdirs self-heal** — QueueUpdate / IngestLog / KnowledgeRipple all
  `mkdirSync(..., { recursive: true })` before first write. Not a blocker.

### Decisions (locked)

- **Vault location → `$VAULT_DIR` + `$PAI_DIR` split.** The source assumes *repo == vault*
  (`.claude/` sits inside the vault, one git root for everything). The fork installs
  `.claude/` **globally** into `~/.claude/`, so that assumption breaks. Resolution:
  vault content resolves from `$VAULT_DIR`; runtime/`MEMORY` state stays anchored to
  `$PAI_DIR` (`~/.claude`). See the ResolveRoot spec under 3.5.
- **`qmd` → documented prerequisite.** Add a Prerequisites note (root `CLAUDE.md` + README +
  Qmd `SKILL.md`): `bun install -g qmd`, set `$VAULT_DIR`. Capture workflows assume qmd present.

**Protocol per skill:**
1. Copy the folder — **excluding `node_modules/`** (Qmd and SecondBrain each carry ~29 MB;
   rely on dest `bun` resolution or run `bun install` in `Tools/`).
2. Run sanitization audit: `grep -riE "rodrigo|canoteran|superuser|promptpal|/Users/" Releases/v5.0.0/.claude/skills/<Skill>/` (expect clean).
3. Replace any hits with template variables (`{{YOUR_NAME}}`, `$VAULT_DIR`, `$PAI_DIR`) or generic relative paths.
4. Verify SKILL.md frontmatter has no personal `author:` or `license:` fields that leak identity.
5. Commit: `feat(skills): port <Skill> from private fork`

**Port in this exact order (dependency chain):**

- [x] **3.0** Pre-flight — copy `commands/qmd/{ask,search,context,reindex}.md` →
  `Releases/v5.0.0/.claude/commands/qmd/`. The per-skill protocol only copies `skills/<Skill>/`,
  but Qmd's `SKILL.md` routes to `../commands/qmd/*.md`; without these the routing is dead. ✅ 2026-06-08
- [x] **3.1** `Qmd` — copy `SKILL.md` + `Tools/` (no `node_modules/`). **Fix `LintFrontmatter.ts`
  check F4**: it only accepts ISO 8601, but SecondBrain *mandates* `%Y-%m-%d %I:%M %p` local
  timestamps — F4 currently warns on every compliant note. Align F4 with the mandated format.
  Add the qmd-prerequisite note. ✅ 2026-06-08 — F4 fix verified (local + ISO pass, garbage warns).
- [x] **3.2** `ObsidianMarkdown` — straight copy incl. `references/`. Zero deps, zero personal data. ✅ 2026-06-08
- [x] **3.3** `ObsidianBases` — straight copy incl. `references/`. Zero deps. ✅ 2026-06-08
- [x] **3.4** `ObsidianCLI` — straight copy. Wraps the `obsidian` CLI (requires Obsidian open) —
  document as a prerequisite; no absolute app paths present. ✅ 2026-06-08
- [x] **3.5** `SecondBrain` — ResolveRoot rewritten to the `$VAULT_DIR`/`$PAI_DIR` split;
  consumer safety table verified empirically against throwaway anchors (`tsc --noEmit` clean).
  `node_modules` stripped, dangling provenance dropped, `defuddle` left to the workflow's
  existing graceful degradation (bun install hint). ✅ 2026-06-08
- [x] **3.6** `ProjectManagement` — ported. Template-renderer resolved: placeholders are
  **model-filled inline** (no Templater). Documented `$VAULT_DIR` CWD convention (no Tools/).
  ✅ 2026-06-08
- [x] **3.7** `DailyRituals` — ported, same model-fill + `$VAULT_DIR` CWD conventions. ✅ 2026-06-08

**Known follow-up — frontmatter descriptions:** SecondBrain / ProjectManagement / DailyRituals
SKILL.md `description:` fields still carry repo==vault framing ("PAI vault", "PAI repo root").
Editing a skill's frontmatter `description` routes through `CreateSkill` per
`skills/CLAUDE.md` (it has trigger-routing implications), so these were deferred to a
dedicated CreateSkill pass rather than hand-edited.

**ResolveRoot rewrite spec (3.5) — provably non-breaking:**

`paths.root` / `resolveRoot()` is consumed in exactly three places, all meaning *vault root*
(`ResolveDomain` `join(root,"domains")`, `KnowledgeRipple` `relative(paths.root, notePath)`,
`QmdUpdate` `filePath.startsWith(root)`). The five `memory*` fields are consumed in isolation
(QueueUpdate→`memoryState`, IngestLog→`memoryObservability`, KnowledgeRipple→`memoryHarvestQueue`);
no consumer ever mixes a `memory*` path with `root`. Therefore:

- `resolveRoot()` → returns **vault root**: `$VAULT_DIR` (or `$OBSIDIAN_VAULT`), fallback to
  `git rev-parse --show-toplevel`, else throw with a helpful message. *All three vault
  consumers stay byte-for-byte correct.*
- Add internal `resolvePaiDir()` → `$PAI_DIR` (fallback `${HOME}/.claude`).
- Rebase only the five `memory*` fields in `vaultPaths()` from `${root}/.claude/PAI/MEMORY/...`
  to `${paiDir}/PAI/MEMORY/...`. *Vault fields (`inboxRaw`…`bases`) and `root` stay derived
  from vault root — unchanged.*

| Consumer | Field used | After split | Breaks? |
|---|---|---|---|
| ResolveDomain | `resolveRoot()` (vault) | vault root | no |
| QmdUpdate | `resolveRoot()` (vault) | vault root | no |
| KnowledgeRipple | `paths.root` + `memoryHarvestQueue` | vault root + `$PAI_DIR` | no |
| QueueUpdate | `memoryState` | `$PAI_DIR` | no |
| IngestLog | `memoryObservability` | `$PAI_DIR` | no |

**Carry-forward to Phase 4 — RESOLVED:** initial instinct was a differentiated gitignore
(`domains/`/`plan/` tracked, `inbox/`/`thinking/` ignored). Decision (2026-06-08): ship a
**uniform blanket-ignore** (`*` / `!.gitkeep` / `!.gitignore`) on every content folder —
public-fork safety wins; users relax a folder's `.gitignore` in their own private fork to
version it. `VaultStructure.md` updated to match.

**After all 7 ported:** update the Obsidian group in the root `CLAUDE.md` skills table (Phase 2.3 step 3).

**Post-port correction (2026-06-09):** step 3.0 copied only `commands/qmd/`, but SecondBrain,
DailyRituals, and ProjectManagement also ship slash-command wrappers that route to their
workflows — these were missed, leaving the documented `/capture`, `/process`, `/week-prep`,
`/task-sync` entry points unreachable. Caught during the user-journeys analysis (see
`OBSIDIAN_USER_JOURNEYS.md` P0-1) and fixed in commit `4d7a4e7`: 17 command files ported —
SecondBrain (10, root), DailyRituals (`rituals/`, 3), ProjectManagement (`manage/`, 4). Open
follow-up: subdir namespacing makes them `/rituals:week-prep` not the bare `/week-prep` the
SKILL.md tables document — flatten or update the docs.

---

## Phase 4 — Vault scaffold template

**Goal:** users who clone the fork get a ready-to-use Obsidian vault folder structure.
Each folder contains only `.gitkeep` + a `.gitignore` that prevents personal notes from being committed.

- [x] **4.1** Create these folders at repo root: ✅ 2026-06-08 — 7 folders created (`inbox/raw`, `inbox/ready`, `plan`, `thinking`, `domains`, `bases`, `dashboards`).

  | Folder | Purpose |
  |---|---|
  | `inbox/raw/` | Unprocessed captures — web clips, voice notes, raw ideas. Nothing filed here; it's a holding pen. |
  | `inbox/ready/` | Processed captures awaiting filing into `domains/` or `bases/`. |
  | `plan/` | Project plans, ISA artifacts, PRDs. Active work-in-progress. |
  | `thinking/` | Working notes, Council/RedTeam outputs, research drafts. Exploratory, not final. |
  | `domains/` | Evergreen knowledge by subject area. Long-lived notes that compound over time. |
  | `bases/` | Obsidian Bases files (`.base` extension). Database views over the vault. |
  | `dashboards/` | MOC-style hub notes, daily/weekly dashboards, entry points into the vault. |

- [x] **4.2** Add to each folder: `.gitkeep` + blanket-ignore `.gitignore` (`*` / `!.gitkeep` /
  `!.gitignore`). ✅ 2026-06-08 — blanket-ignore verified (a test `domains/note.md` is git-ignored).

- [x] **4.3** Add vault conventions block to root `CLAUDE.md`. ✅ 2026-06-08 — folder table,
  filing flow (`inbox/raw` → `/process` → `inbox/ready` → `/distribute` → `domains/`), note
  format (YAML frontmatter, local `YYYY-MM-DD HH:MM AM/PM` timestamps, wikilinks), and the
  blanket-ignore git note. Generic template language only.

---

## Phase 5 — USER scaffold templates — ❌ OBSOLETE (dropped 2026-06-08)

**Why dropped:** Phase 5 would have created a *second* identity system at the repo root
(`USER/PRINCIPAL_IDENTITY.md`, `USER/DA_IDENTITY.md`, `USER/TELOS/...`) wired into the root
`CLAUDE.md`. The installed product already ships a complete one: `Releases/v5.0.0/.claude/PAI/USER/`
contains `PRINCIPAL_IDENTITY.md`, `DA_IDENTITY.md`, `TELOS/PRINCIPAL_TELOS.md` (and 17 more) as
fill-in-the-blank bootstrap templates, the installed `.claude/CLAUDE.md` already `@`-imports them
(lines 6–9), and the `/interview` skill exists to populate them. Building Phase 5 would have
duplicated identity in one repo (drift risk) and loaded a personal DA persona into the *root*
CLAUDE.md — the fork's development/operating context — where identity doesn't belong. Identity
lives in the runtime (`PAI/USER/`), which is already solved.

The one genuinely useful idea here — a "never commit personal identity" gitignore firewall —
applies to the *existing* `PAI/USER/`, not a new folder. Capture it as a verification task if
desired (audit `PAI/USER/*` are all placeholders, no real data), but it is not a scaffold-build.

---

## Phase 6 — Wire the private fork sync

Back in `Personal_AI_Infrastructure/`.

- [x] **6.1** Test the sync flow ✅ 2026-06-08. `obsidian` remote fetches cleanly; after pushing
  `obsidian-edition`, the private fork sees all 22 public-fork commits via
  `git log HEAD..obsidian/obsidian-edition`. (Fixed: 6.1 originally referenced `obsidian/main`;
  the canonical sync branch is `obsidian-edition`.)

- [x] **6.2** Verify personal-only vs inherited skills ✅ 2026-06-08. Clean partition:
  **6 personal-only** (`ArXiv`, `BrightData`, `Interceptor`, `PAIUpgrade`, `PrivateInvestigator`,
  `Remotion` — the Phase 2.1 removals), **46 shared**, **0 public-only**.

- [x] **6.3** Document the ongoing sync command ✅ 2026-06-08 — **and corrected a dangerous one.**

  > ⛔ **DO NOT `git merge obsidian/obsidian-edition` into the private fork.** A merge preview
  > (`git merge-tree`) shows it would change 9,111 files with ~1.74M deletions and hundreds of
  > rename/delete conflicts. The two forks store the same skills at **different paths** with
  > **divergent histories**: public = `Releases/v5.0.0/.claude/skills/`, private = `.claude/skills/`
  > (private has no `Releases/`). A full-tree merge tries to reconcile them and guts the private repo.

  **Correct sync = selective, file-level adoption** of the specific skill dirs you want. Both repos
  are checked out locally, so the simplest safe path is `rsync` from the public release into the
  private runtime, then review + commit:

  ```bash
  cd ~/Documents/GitHub/Personal_AI_Infrastructure
  git fetch obsidian                      # keeps remote-tracking refs current (optional, for diffing)

  # Adopt the Obsidian skills you want (review each diff first — this OVERWRITES local copies):
  PUB=~/Documents/GitHub/pai-obsidian/Releases/v5.0.0/.claude/skills
  for s in Qmd ObsidianMarkdown ObsidianBases ObsidianCLI SecondBrain ProjectManagement DailyRituals; do
    rsync -an --exclude node_modules "$PUB/$s/" ".claude/skills/$s/"   # -n = DRY RUN; inspect first
  done
  # drop the -n once the dry-run looks right, then:
  git add .claude/skills && git commit -m "sync: adopt Obsidian skill updates from pai-obsidian"
  git push origin main
  ```

  Note: the ported skills' `$VAULT_DIR` split keeps a git-root fallback, so adopting them in the
  private fork is backward-compatible even if you still run private in repo==vault mode.

---

## Phase 7 — Tag and publish

- [x] **7.1** Tag the first release ✅ 2026-06-08. Tagged **`obsidian-v1.0.0`** (prefixed, not
  plain `v1.0.0` — the repo already carries inherited PAI tags up to `v2.0.0`, so a plain
  `v1.0.0` would sit below them). `main` fast-forwarded to `obsidian-edition` and the tag
  landed on `main`. Marks **part one**: 7 Obsidian skills ported with the `$VAULT_DIR`/`$PAI_DIR`
  split, vault scaffold, private-fork sync. Part Two (lean + Obsidian-native) is tracked above.
- [x] **7.2** README three-tier model finalized ✅ 2026-06-08 (cross-checked from 2.4; skill
  count corrected 39 → 46, install path fixed).

> ⚠️ Tagged **pre-install-verification**. The fresh-install flow still needs an end-to-end
> run (doc/path bugs were already shaken out 2026-06-08). If the verified install surfaces
> fixes, cut `obsidian-v1.0.1`.

---

## Ongoing Sync Cadence

| Event | Command | Repo |
|---|---|---|
| PAI upstream releases | `git fetch upstream && git merge upstream/main` | pai-obsidian |
| You add to pai-obsidian | `git push origin obsidian-edition` | pai-obsidian |
| Pull obsidian updates to private | **selective rsync of skill dirs** (see Phase 6.3) — **never** `git merge obsidian/*` | pai-private |
| Add personal skill to private | commit directly to `main` | pai-private |

---

# Part Two — Lean + Obsidian-native (post-v1.0.0)

Part one (Phases 1–7) was **additive**: port the Obsidian skills in, scaffold the vault.
Part two is **shaping**: make the fork actually *be* what its README claims.

**Anchoring finding (2026-06-08):** the README/CLAUDE.md say the fork "strips upstream
machinery (Pulse, the DA daemon, Forge, RTK)," but the shipped `Releases/v5.0.0/.claude/`
bundle (78M) still contains all of it — `PAI/PULSE` (6.7M web dashboard + Next.js
Observability app), `PAI/PAI-Install` (3.7M Electron GUI installer) — and the installed
operating `CLAUDE.md` still wires in Forge, RTK, Interceptor (mandatory ×3), Pulse,
ElevenLabs voice (`localhost:31337`), and 4 MODES. The fork is "lean Obsidian-focused" in
name, ~90% un-stripped PAI in substance. Part two closes that gap — **selectively**, per the
decisions below (the operator wants to keep Pulse and the installer, not strip them).

### Decisions (2026-06-08)

- **Pulse — KEEP and repurpose (do NOT delete).** The operator wants the web platform to
  visualize key components of memory (and whatever else) in a different way than Obsidian
  offers. Future direction: modify Pulse so it reads/visualizes the **vault's** memory
  (see Phase 11 — if knowledge moves to the vault, Pulse reads the vault instead of
  `MEMORY/KNOWLEDGE`). Treat Pulse as a custom visualization surface, not dead weight.
- **Installer — KEEP and Obsidian-orient (do NOT replace).** The operator likes the
  installer. Modifications to consider: add `$VAULT_DIR` setup + Obsidian plugin install to
  the wizard; soften the destructive/global behavior (it currently backs-up-and-replaces
  `~/.claude`, hardcodes the global path, edits four shell rc files, installs a Pulse
  menubar launchd agent). Also fix: the installer lives at
  `Releases/v5.0.0/.claude/install.sh` (the root quick-start path bug was fixed 2026-06-08).

### Phase 8 — Lean the operating context + skill set (keep Pulse)

- [ ] **8.1** Rewrite the installed `Releases/v5.0.0/.claude/CLAUDE.md` for knowledge work:
  strip/soften MODES, Forge auto-include, RTK, Interceptor-mandatory, and the voice curls
  that don't serve an Obsidian vault. Run the fork's own `BitterPillEngineering` skill on it.
- [ ] **8.2** Move tangential skills to `Packs/` so the default install is the
  Thinking + Research + Knowledge + Obsidian core (~20), opt-in for the rest. Candidates to
  demote from default: `Daemon`, `Sales`, `Webdesign`, `Art`, `AudioEditor`, `Apify`,
  `Browser`, `CreateCLI`, `Agents`, `Delegation`, `Evals`. (Pulse stays.)

### Phase 9 — Obsidian-native UI (ACCEPTED)

- [ ] **9.1** Ship a configured `.obsidian/` with the vault scaffold:
  `community-plugins.json` enabling **Tasks**, **Bases** (or Dataview), and optionally
  **Templater**; a sane `app.json`. (VaultStructure.md already references `.obsidian/app.json`
  that doesn't exist yet — close that gap.)
- [ ] **9.2** Dashboards as Obsidian notes: `dashboards/` holds MOC hubs + a live `TASKS.md`
  rendered by the Tasks plugin (status symbols are already Tasks-compatible).
- [ ] **9.3** Bases as the database UI: ship starter `.base` files in `bases/` giving
  table/card/gallery views over `domains/`. Driven by the `ObsidianBases` skill.

### Phase 10 — Obsidian-orient the installer (keep it)

- [ ] **10.1** Add `$VAULT_DIR` prompt + persistence to the wizard; optionally install the
  Obsidian plugins from 9.1.
- [ ] **10.2** Make the install less destructive / redirectable: honor `CLAUDE_CONFIG_DIR`,
  avoid clobbering Claude Code's own `projects/sessions/history`, make the system-wide shell
  edits + menubar install opt-in.

### Phase 11 — FUTURE CONSIDERATION: collapse to vault-as-single-source-of-truth

**Status: deliberate, plan carefully. Logged 2026-06-08 for future sessions. Not scheduled.**

**The problem.** There are currently **two** knowledge systems running in parallel:

1. **PAI's typed graph** — `$PAI_DIR/PAI/MEMORY/KNOWLEDGE/{People,Companies,Ideas,Research}`,
   populated by the harvest pipeline (`PAI/TOOLS/KnowledgeHarvester.ts`,
   `HarvestExecutor.ts`, `SessionHarvester.ts`).
2. **The Obsidian vault** — `$VAULT_DIR/domains/…` (knowledge as notes).

They are bridged by **SecondBrain's `KnowledgeRipple.ts`**: it extracts `[[Entity]]` wikilinks
from vault notes → writes frontmatter-only stubs to `MEMORY/KNOWLEDGE/_harvest-queue/<slug>.md`
→ `KnowledgeHarvester` consumes those into the typed graph. SecondBrain deliberately *never*
writes the typed graph directly (invariant i8). This rippling is the single biggest remaining
source of complexity.

**The bet.** Make the **vault the one source of truth**. Typed entities become vault notes
with `type:` frontmatter (People/Companies/Ideas/Research), queried via **Obsidian Bases**.
Delete the `_harvest-queue` handoff and the separate `MEMORY/KNOWLEDGE` typed graph. Result:
single source of truth, no rippling, fully Obsidian-native, Bases as the query/UI layer.

**Why plan carefully — what it touches (audit before doing):**
- **Rewrites SecondBrain's core** — `KnowledgeRipple.ts`, `ResolveDomain.ts`, and the whole
  `_harvest-queue` handoff in the workflows (`QuickDump`, `Save`, `Distribute`, `CloseDay`).
- **Deprecates/repurposes** the `Knowledge` skill (direct CRUD on `MEMORY/KNOWLEDGE`) and the
  harvest pipeline (`KnowledgeHarvester`, `HarvestExecutor`, `SessionHarvester`).
- **Downstream readers of `MEMORY/KNOWLEDGE`** must be re-pointed at the vault: audit
  `Telos`, `ContextSearch`, `MemoryRetriever.ts`, `KnowledgeGraph.ts`, and — critically —
  **Pulse** (the operator is keeping Pulse and it currently reads `MEMORY`; if knowledge moves
  to the vault, Pulse must read the vault). **Phase 11 and Pulse-repurposing are linked.**
- **Data migration** — existing typed-graph entries → vault notes with `type:` frontmatter.
- **Interacts with the `$VAULT_DIR`/`$PAI_DIR` split** (built in Phase 3.5 assuming the dual
  model): collapsing changes *where* knowledge lives, though the split itself still holds
  (vault content vs runtime state).

**Recommended approach when picked up:** start with a dependency audit (grep every reader of
`MEMORY/KNOWLEDGE`), prototype the Bases-over-`type:`-frontmatter query layer, then migrate
SecondBrain to write typed vault notes directly — retiring the ripple/harvest path last, once
Pulse and the other readers are re-pointed.
