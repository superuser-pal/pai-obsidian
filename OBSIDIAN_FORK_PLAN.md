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

**Protocol per skill:**
1. Copy the folder.
2. Run sanitization audit: `grep -ri "rodrigo\|canoteran\|superuser\|promptpal\|HOME\|pai-private" Releases/v5.0.0/.claude/skills/<Skill>/`
3. Replace hits with template variables (`{{YOUR_NAME}}`, `{{VAULT_DIR}}`, `${PAI_DIR}`) or generic relative paths.
4. Verify SKILL.md frontmatter has no personal `author:` or `license:` fields that leak identity.
5. Commit: `feat(skills): port <Skill> from private fork`

**Port in this exact order (dependency chain):**

- [ ] **3.1** `Qmd` — foundational vault search used by SecondBrain. Hardcodes vault path — must be replaced with `${VAULT_DIR}` env var.
- [ ] **3.2** `ObsidianMarkdown` — no dependencies. Formatting conventions for Obsidian-flavored MD (callouts, front-matter, wikilinks).
- [ ] **3.3** `ObsidianBases` — no dependencies. Manages Bases (Obsidian's native database view). Check for any hardcoded base names.
- [ ] **3.4** `ObsidianCLI` — no dependencies. Wraps `obsidian-cli` or URI scheme commands. Replace any absolute app paths.
- [ ] **3.5** `SecondBrain` — depends on `Qmd`. Core capture/process/file workflow. Heavy on vault-path refs.
- [ ] **3.6** `ProjectManagement` — depends on SecondBrain patterns. Check for any project-specific folder names to generalize.
- [ ] **3.7** `DailyRituals` — depends on SecondBrain + ProjectManagement. Check for time-zone, calendar, or personal schedule refs.

**After all 7 ported:** update the Obsidian group in the root `CLAUDE.md` skills table (Phase 2.3 step 3).

---

## Phase 4 — Vault scaffold template

**Goal:** users who clone the fork get a ready-to-use Obsidian vault folder structure.
Each folder contains only `.gitkeep` + a `.gitignore` that prevents personal notes from being committed.

- [ ] **4.1** Create these folders at repo root:

  | Folder | Purpose |
  |---|---|
  | `inbox/raw/` | Unprocessed captures — web clips, voice notes, raw ideas. Nothing filed here; it's a holding pen. |
  | `inbox/ready/` | Processed captures awaiting filing into `domains/` or `bases/`. |
  | `plan/` | Project plans, ISA artifacts, PRDs. Active work-in-progress. |
  | `thinking/` | Working notes, Council/RedTeam outputs, research drafts. Exploratory, not final. |
  | `domains/` | Evergreen knowledge by subject area. Long-lived notes that compound over time. |
  | `bases/` | Obsidian Bases files (`.base` extension). Database views over the vault. |
  | `dashboards/` | MOC-style hub notes, daily/weekly dashboards, entry points into the vault. |

- [ ] **4.2** Add to each folder:
  - `.gitkeep` (empty, makes git track the folder)
  - `.gitignore` with exactly:
    ```
    *
    !.gitkeep
    !.gitignore
    ```
  This lets users fill the vault locally without any risk of committing personal notes.

- [ ] **4.3** Add vault conventions block to root `CLAUDE.md` (back-fill from 2.3):
  - What each folder is for (from the table above).
  - Filing rule: everything enters via `inbox/raw/`, gets processed to `inbox/ready/`, then filed to `domains/` or `bases/`.
  - Note format: Obsidian front-matter (`---` YAML), wikilinks preferred over markdown links inside vault.
  - Do NOT include personal daily ritual details — keep it generic template language.

---

## Phase 5 — USER scaffold templates

**Goal:** provide fill-in-the-blank identity files so the fork works as a starting point without leaking personal data. `USER/` does not currently exist in this repo — create it from scratch.

- [ ] **5.1** Create `USER/PRINCIPAL_IDENTITY.md` — who the human is:
  ```markdown
  ---
  name: {{YOUR_NAME}}
  role: {{YOUR_ROLE}}
  ---

  # Principal Identity

  **Name:** {{YOUR_NAME}}
  **Role / title:** {{YOUR_ROLE}}
  **Primary goals:** {{YOUR_GOALS}}
  **Communication style:** {{DIRECT|COLLABORATIVE|FORMAL}}
  ```

- [ ] **5.2** Create `USER/DA_IDENTITY.md` — the digital assistant persona:
  ```markdown
  ---
  name: {{DA_NAME}}
  ---

  # Digital Assistant Identity

  **Name:** {{DA_NAME}}
  **Personality:** {{DESCRIBE_TONE}}
  **Specialization:** Obsidian-based knowledge management and personal productivity.
  ```

- [ ] **5.3** Create `USER/TELOS/PRINCIPAL_TELOS.md` — purpose and values template:
  ```markdown
  # Principal Telos

  ## Mission
  {{YOUR_MISSION_STATEMENT}}

  ## Core values
  - {{VALUE_1}}
  - {{VALUE_2}}

  ## Current focus areas
  - {{FOCUS_1}}
  - {{FOCUS_2}}
  ```

- [ ] **5.4** Create `USER/.gitignore`:
  ```
  *
  !.gitignore
  ```
  This makes `USER/` effectively invisible to git so private forks can drop real identity files here without risk of committing them. The template files in 5.1–5.3 are committed because they're tracked before the `.gitignore` is created — add them first, then add the `.gitignore` in a separate commit.

- [ ] **5.5** Add `@USER/PRINCIPAL_IDENTITY.md` and `@USER/DA_IDENTITY.md` imports to the top of root `CLAUDE.md` (back-fill from 2.3, once USER/ files exist).

---

## Phase 6 — Wire the private fork sync

Back in `Personal_AI_Infrastructure/`.

- [ ] **6.1** Test the sync flow:
  ```bash
  git fetch obsidian
  git log obsidian/main..HEAD
  git log HEAD..obsidian/main
  ```
- [ ] **6.2** Verify personal-only skills are clearly separated from inherited skills.
- [ ] **6.3** Document the ongoing sync command:
  ```bash
  git fetch obsidian
  git merge obsidian/obsidian-edition
  git push origin main
  ```

---

## Phase 7 — Tag and publish

- [ ] **7.1** Tag the first release:
  ```bash
  git checkout obsidian-edition
  git tag v1.0.0
  git push origin v1.0.0
  ```
- [ ] **7.2** Write `README.md` explaining the three-tier model (fork this → add personal layer on top). *(Covered by 2.4 above — cross-check and finalize here.)*

---

## Ongoing Sync Cadence

| Event | Command | Repo |
|---|---|---|
| PAI upstream releases | `git fetch upstream && git merge upstream/main` | pai-obsidian |
| You add to pai-obsidian | `git push origin obsidian-edition` | pai-obsidian |
| Pull obsidian updates to private | `git fetch obsidian && git merge obsidian/obsidian-edition` | pai-private |
| Add personal skill to private | commit directly to `main` | pai-private |
