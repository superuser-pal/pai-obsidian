# pai-obsidian Fork Plan

Three-tier cascade: `danielmiessler/PAI` → `superuser-pal/pai-obsidian` (public) → `superuser-pal/pai-private` (personal brain).

---

## Phase 1 — Create the fork and wire the remotes

- [x] **1.1** Go to `github.com/danielmiessler/Personal_AI_Infrastructure` → Fork → name it `pai-obsidian` under `superuser-pal` ✅ 2026-06-06
- [x] **1.2** Clone locally: `git clone git@github.com:superuser-pal/pai-obsidian.git ~/Documents/GitHub/pai-obsidian` ✅ 2026-06-06
- [x] **1.3** Wire remotes in `pai-obsidian`: ✅ 2026-06-06
  ```bash
  cd ~/Documents/GitHub/pai-obsidian
  git remote add upstream https://github.com/danielmiessler/Personal_AI_Infrastructure.git
  git fetch upstream
  git remote -v
  ```
- [x] **1.4** Wire `obsidian` remote into private fork: ✅ 2026-06-06
  ```bash
  # In Personal_AI_Infrastructure/
  git remote add obsidian git@github.com:superuser-pal/pai-obsidian.git
  git remote -v
  ```
- [x] **1.5** Create permanent working branch in `pai-obsidian`: ✅ 2026-06-06
  ```bash
  git checkout -b obsidian-edition
  git push -u origin obsidian-edition
  ```

---

## Phase 2 — Trim the release installer (in pai-obsidian Claude Code session)

**Approach change from original plan:** `Packs/` stays intact as reference material.
Trimming targets `Releases/v5.0.0/.claude/skills/` — the actual installer users run.
Verdicts are tracked in `OBSIDIAN_FORK_BACKLOG.md`.

- [x] **2.1** Trim `Releases/v5.0.0/.claude/skills/` — remove non-Obsidian skills per backlog verdicts: ✅ 2026-06-07
  Removed: `ArXiv`, `BrightData`, `Interceptor`, `PAIUpgrade`, `PrivateInvestigator`, `Remotion`
  Remaining: 39 skills aligned with Obsidian use cases.
- [ ] **2.2** Merge `chore/archive-purge` into `obsidian-edition` so all trimming work lands on the right branch.
- [ ] **2.3** Create `CLAUDE.md` at repo root — Obsidian-fork identity, kept skills reference, vault conventions. *(See PR 4 in backlog.)*

---

## Phase 3 — Port the 7 Obsidian skills from private fork

Still in the `pai-obsidian` session. Port in this exact order (dependency chain).

For each skill:
1. Copy folder from `~/Documents/GitHub/Personal_AI_Infrastructure/.claude/skills/<Skill>/`
2. Audit: `grep -ri "rodrigo\|canoteran\|superuser\|promptpal\|HOME/" .claude/skills/<Skill>/`
3. Replace any personal refs with template variables or relative paths
4. Commit: `feat(skills): port <Skill> from private fork`

- [ ] **3.1** Port `Qmd` — foundational search, SecondBrain depends on it
- [ ] **3.2** Port `ObsidianMarkdown` — no dependencies
- [ ] **3.3** Port `ObsidianBases` — no dependencies
- [ ] **3.4** Port `ObsidianCLI` — no dependencies
- [ ] **3.5** Port `SecondBrain` — depends on Qmd
- [ ] **3.6** Port `ProjectManagement` — depends on SecondBrain patterns
- [ ] **3.7** Port `DailyRituals` — depends on SecondBrain + ProjectManagement

---

## Phase 4 — Add the vault scaffold template

- [ ] **4.1** Create scaffold folders at `pai-obsidian` root: `inbox/raw`, `inbox/ready`, `plan`, `thinking`, `domains`, `bases`, `dashboards`
- [ ] **4.2** Add `.gitkeep` + content `.gitignore` to each folder (ignores everything except `.gitkeep` and `.gitignore` — users fill vault without committing personal notes)
- [ ] **4.3** Extract vault conventions block from private fork's `CLAUDE.md` → add to `pai-obsidian`'s `CLAUDE.md` (strip personal refs first)

---

## Phase 5 — Wire the USER scaffold templates

- [ ] **5.1** Audit `USER/` in `pai-obsidian` — replace personal content with `{{TEMPLATE}}` variables
  Key files: `PRINCIPAL_IDENTITY.md`, `DA_IDENTITY.md`, `TELOS/`
- [ ] **5.2** Add `USER/.gitignore` so the private fork layer can override these files locally without committing personal data

---

## Phase 6 — Wire the private fork sync

Back in `Personal_AI_Infrastructure/`.

- [ ] **6.1** Test the sync flow:
  ```bash
  git fetch obsidian
  git log obsidian/main..HEAD
  git log HEAD..obsidian/main
  ```
- [ ] **6.2** Verify personal-only skills are clearly separated from inherited skills
- [ ] **6.3** Document the ongoing sync command:
  ```bash
  git fetch obsidian
  git merge obsidian/obsidian-edition
  git push origin main
  ```

---

## Phase 7 — Tag and publish

- [ ] **7.1** Tag the first release in `pai-obsidian`:
  ```bash
  git checkout obsidian-edition
  git tag v1.0.0
  git push origin v1.0.0
  ```
- [ ] **7.2** Write README explaining the three-tier model (fork this → add personal layer on top)

---

## Ongoing Sync Cadence

| Event | Command | Repo |
|---|---|---|
| PAI upstream releases | `git fetch upstream && git merge upstream/main` | pai-obsidian |
| You add to pai-obsidian | `git push origin obsidian-edition` | pai-obsidian |
| Pull obsidian updates to private | `git fetch obsidian && git merge obsidian/obsidian-edition` | pai-private |
| Add personal skill to private | commit directly to `main` | pai-private |
