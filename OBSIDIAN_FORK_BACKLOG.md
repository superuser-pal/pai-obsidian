# pai-obsidian Fork — Backlog (PRs 2–8)

See `OBSIDIAN_FORK_PLAN.md` for the three-tier architecture overview and phases 1–7.
This file tracks the lean-down PR sequence on the `obsidian-edition` branch.

---

## Pack inventory — decide what to cut in PRs 2–3

All 52 active Packs with removal verdict:

| Pack | Category | PR 2.1 verdict | Notes |
|---|---|---|---|
| `Agents` | Orchestration | PR 3 candidate | Multi-agent, overkill for notes |
| `ApertureOscillation` | Core machinery | **KEEP** | Plan 2.3 protected |
| `Algorithm` | Core | **KEEP** | Recent fixes, referenced in commits |
| `Aphorisms` | Nice-to-have | PR 2 remove | Not functional |
| `Apify` | External API | PR 2 remove | Apify web scraping |
| `ArXiv` | Research | **KEEP** | Research/knowledge work |
| `Art` | Media/Discord | PR 2 remove | 39 MB + Discord bot |
| `AudioEditor` | Media | PR 2 remove | Audio processing |
| `BeCreative` | Creative | **KEEP** | Useful for note-taking |
| `BitterPillEngineering` | Domain-specific | PR 3 candidate | Read SKILL.md first |
| `BrightData` | External API | PR 2 remove | Data harvesting service |
| `Browser` | Automation | PR 2 remove | Browser automation |
| `ContentAnalysis` | Knowledge work | **KEEP** | Obsidian-relevant |
| `ContextSearch` | Core | **KEEP** | Core |
| `Council` | Core reasoning | **KEEP** | Plan 2.3 protected |
| `CreateCLI` | Dev tooling | PR 3 candidate | CLI creation, not needed |
| `CreateSkill` | Core machinery | **KEEP** | Plan 2.3 protected |
| `Daemon` | Background jobs | PR 2 remove | Background daemon infra |
| `Delegation` | Orchestration | PR 3 candidate | AI task delegation |
| `Evals` | ML/Testing | PR 3 candidate | ML evaluation framework |
| `ExtractWisdom` | Core | **KEEP** | Plan 2.3 protected |
| `Fabric` | Core machinery | **KEEP** | Plan 2.3 protected |
| `FirstPrinciples` | Core reasoning | **KEEP** | Plan 2.3 protected |
| `ISA` | Core reasoning | **KEEP** | Plan 2.3 protected |
| `Ideate` | Knowledge work | **KEEP** | Useful for knowledge work |
| `Interceptor` | Unknown | PR 3 candidate | Read SKILL.md first |
| `Interview` | Domain-specific | PR 3 candidate | Interview prep |
| `Investigation` | Research | **KEEP** | Research/knowledge work |
| `IterativeDepth` | Core machinery | **KEEP** | Plan 2.3 protected |
| `Knowledge` | Core | **KEEP** | Plan 2.3 protected |
| `Loop` | Orchestration | PR 3 candidate | Looping patterns |
| `Media` | Media gen | PR 2 remove | Audio/video generation |
| `Migrate` | Dev tooling | PR 3 candidate | Migration tooling |
| `Optimize` | Reasoning | **KEEP** | Useful |
| `PAIUpgrade` | Upstream mgmt | PR 2 remove | Upstream version tracking |
| `PrivateInvestigator` | OSINT | PR 2 remove | OSINT investigations |
| `Prompting` | LLM tooling | **KEEP** | Useful for LLM work |
| `RedTeam` | Security | PR 3 candidate | Security red teaming |
| `Remotion` | Video gen | PR 2 remove | Video generation |
| `Research` | Core | **KEEP** | Plan 2.3 protected |
| `RootCauseAnalysis` | Reasoning | **KEEP** | Useful |
| `Sales` | Domain-specific | PR 2 remove | Sales workflows |
| `Science` | Core reasoning | **KEEP** | Plan 2.3 protected |
| `Scraping` | Web scraping | PR 2 remove | Web scraping infra |
| `Security` | Security | PR 3 candidate | Security-focused pack |
| `SystemsThinking` | Reasoning | **KEEP** | Useful |
| `Telos` | Identity/purpose | **KEEP** | Keep, simplify |
| `Thinking` | Core reasoning | **KEEP** | Core |
| `USMetrics` | US data | PR 2 remove | US-specific data |
| `Utilities` | Core | **KEEP** | Keep, trim dupes |
| `Webdesign` | Domain-specific | PR 3 candidate | Web design |
| `WorldThreatModel` | Threat modeling | PR 3 candidate | Geopolitical modeling |
| `WriteStory` | Narrative gen | PR 2 remove | Narrative generation |

After PRs 2+3 the expected kept set (~23–25 packs):
`ApertureOscillation`, `Algorithm`, `ArXiv`, `BeCreative`, `ContentAnalysis`, `ContextSearch`, `Council`, `CreateSkill`, `ExtractWisdom`, `Fabric`, `FirstPrinciples`, `ISA`, `Ideate`, `Investigation`, `IterativeDepth`, `Knowledge`, `Optimize`, `Prompting`, `Research`, `RootCauseAnalysis`, `Science`, `SystemsThinking`, `Telos`, `Thinking`, `Utilities`

---

## PR 2 — Obvious pack removals (no cross-dependencies)

Packs confirmed for removal — no Obsidian relevance, no documented dependencies:

```bash
git rm -r Packs/Aphorisms Packs/Apify Packs/Art Packs/AudioEditor \
  Packs/BrightData Packs/Browser Packs/Daemon Packs/Media \
  Packs/PAIUpgrade Packs/PrivateInvestigator Packs/Remotion \
  Packs/Sales Packs/Scraping Packs/USMetrics Packs/WriteStory
```

Verify: `grep -r "Apify\|BrightData\|Remotion" Packs/` returns nothing.

---

## PR 3 — Judgment-call packs (read SKILL.md before each removal)

Candidates — confirm by reading each pack's `SKILL.md`:

```
Packs/Agents
Packs/BitterPillEngineering
Packs/CreateCLI
Packs/Delegation
Packs/Evals
Packs/Interceptor
Packs/Interview
Packs/Loop
Packs/Migrate
Packs/RedTeam
Packs/Security
Packs/Webdesign
Packs/WorldThreatModel
Packs/Silas  (if present)
```

Verify: `ls Packs/ | wc -l` ≈ 23–25 after removal.

---

## PR 4 — Documentation overhaul

- Create `CLAUDE.md` at root (Obsidian-fork context, kept packs reference, vault conventions)
- Rewrite `README.md` (Obsidian fork identity, three-tier model)
- Delete or trim `PLATFORM.md` (upstream architecture, not fork-relevant)
- Update `SECURITY.md` (strip upstream-specific references)

---

## PR 5 — `.claude/` scaffold

Create the active Claude Code configuration (currently absent):
- `.claude/skills/` — kept packs installed
- `.claude/settings.json` — Obsidian-appropriate defaults
- Hooks and commands for kept packs

This is the first PR where the fork is runnable as a Claude Code setup.

---

## PR 6 — `USER/` scaffold

From OBSIDIAN_FORK_PLAN.md phase 5:
- `USER/PRINCIPAL_IDENTITY.md` — `{{YOUR_NAME}}`, `{{YOUR_ROLE}}`, `{{YOUR_GOALS}}`
- `USER/DA_IDENTITY.md` — digital assistant identity template
- `USER/TELOS/` — purpose/values template folder
- `USER/.gitignore` — ignores `*` except `.gitignore` so private forks don't leak personal data

---

## PR 7 — Vault scaffold

From OBSIDIAN_FORK_PLAN.md phase 4:

Folders at repo root (each with `.gitkeep` + `*`-ignoring `.gitignore`):
```
inbox/raw/
inbox/ready/
plan/
thinking/
domains/
bases/
dashboards/
```

Update `CLAUDE.md` with vault conventions block.

---

## PR 8 — Port Obsidian skills

From OBSIDIAN_FORK_PLAN.md phase 3. Port in dependency order from private fork:

1. `Qmd` (SecondBrain depends on it)
2. `ObsidianMarkdown`
3. `ObsidianBases`
4. `ObsidianCLI`
5. `SecondBrain`
6. `ProjectManagement`
7. `DailyRituals`

For each: sanitize personal refs (`grep -ri "rodrigo\|canoteran\|superuser\|promptpal\|HOME/"`) before committing.
