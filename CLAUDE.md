# pai-obsidian

pai-obsidian is a lean, Obsidian-focused fork of [danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure). It strips upstream machinery (Pulse, the DA daemon, Forge, RTK) and ships only the skills relevant to knowledge work, thinking, and research — with a vault scaffold tuned for Obsidian users. It sits in the middle tier of a three-layer cascade: `PAI upstream → pai-obsidian → your private fork`.

## Installation

Run the installer to wire `.claude/` into your home directory:

```bash
bash Releases/v5.0.0/.claude/install.sh
```

## Skills

46 skills ship with this fork, including the 7 Obsidian skills ported in Phase 3 (see the Obsidian group below).

### Thinking

| Skill | Description |
|---|---|
| `ApertureOscillation` | 3-pass scope oscillation — narrow/tactical, wide/strategic, synthesis — to surface design tensions invisible at any single zoom level |
| `BeCreative` | Divergent ideation using Verbalized Sampling + extended thinking for genuine creative diversity |
| `Council` | Multi-agent collaborative debate — 3 rounds of genuine intellectual friction and a synthesis |
| `FirstPrinciples` | Physics-based reasoning — deconstruct to irreducible truths, classify hard vs. soft constraints, reconstruct from fundamentals |
| `Ideate` | Evolutionary ideation engine — 9-phase cycle (consume, dream, steal, mate, test, evolve) with meta-learning across cycles |
| `IterativeDepth` | Structured multi-angle exploration — 2–8 sequential passes from different scientific lenses to surface hidden requirements |
| `RedTeam` | 32 parallel expert agents stress-testing ideas, strategies, and plans with remediation paths |
| `RootCauseAnalysis` | Structured incident investigation: Five Whys, Fishbone, Postmortem, Fault Tree, Kepner-Tregoe |
| `Science` | The scientific method as a universal problem-solving algorithm — goal, hypotheses, experiments, measurement, iteration |
| `SystemsThinking` | Causal loop diagrams, archetype matching, Meadows' leverage points, iceberg model |
| `WorldThreatModel` | Tests ideas and decisions against 11 time horizons (6 months to 50 years) with RedTeam + FirstPrinciples |

### Research

| Skill | Description |
|---|---|
| `ExtractWisdom` | Content-adaptive wisdom extraction from video, podcast, article, or interview — builds custom sections per domain |
| `Fabric` | 240+ specialized prompt patterns: extract_wisdom, threat_model, analyze_claims, improve_writing, create_mermaid, and more |
| `Research` | Comprehensive research in quick/standard/extensive/deep modes with multi-agent parallel investigation |
| `USMetrics` | 68 US economic indicators from FRED, EIA, Treasury, BLS, Census APIs with trend analysis and cross-metric correlation |

### Knowledge

| Skill | Description |
|---|---|
| `ContextSearch` | Searches prior Claude Code session work — PRDs, git history, session names — to recover context between sessions |
| `ISA` | Manages the Ideal State Artifact — universal project spec that articulates "done," drives the build, and verifies it |
| `Knowledge` | Typed Knowledge Archive (People, Companies, Ideas, Research) with search, ingest, graph traversal, and context retrieval |
| `Telos` | Life OS and project analysis — goals, beliefs, wisdom, books, ideal state, dependencies, and project dashboards |

### Creative

| Skill | Description |
|---|---|
| `Aphorisms` | Curated quote/aphorism collection with CRUD, themed search, author research, and newsletter usage tracking |
| `Art` | Generate static visual content via Flux, Gemini, and GPT-Image — headers, diagrams, infographics, thumbnails |
| `AudioEditor` | AI-powered audio cleanup: Whisper transcription → Claude cut classification → ffmpeg editing with crossfades |
| `Sales` | Transforms product documentation into sales narratives + visuals + talking points |
| `WriteStory` | Layered fiction writing across 7 narrative dimensions, grounded in Storr and Forsyth's rhetorical frameworks |

### Dev

| Skill | Description |
|---|---|
| `Agents` | Compose custom one-shot parallel agents from Base Traits + Voice + Specialization |
| `Apify` | Social media and e-commerce scraping via Apify actors — Instagram, LinkedIn, TikTok, YouTube, Google Maps, Amazon |
| `BitterPillEngineering` | Audits instruction sets for over-prompting — classifies every rule as CUT/KEEP/SHARPEN |
| `Browser` | Headless browser automation via agent-browser with persistent auth profiles and parallel sessions |
| `CreateCLI` | Generates production-ready TypeScript CLIs with 3-tier templates (zero-dep Bun → Commander.js → oclif) |
| `CreateSkill` | Full PAI skill lifecycle: scaffold, validate, test effectiveness, improve, optimize trigger descriptions |
| `Daemon` | Manages a public "daemon profile" — aggregates PAI sources, applies security filtering, deploys to Cloudflare Pages |
| `Delegation` | Parallelizes work via 6 patterns: worktree isolation, background agents, custom agents, parallel dispatch |
| `Evals` | AI agent evaluation framework — code-based, model-based, and human graders across transcripts and tool calls |
| `Interview` | Phased conversational interview across PAI context files — reviews TELOS, IDEAL_STATE, preferences, identity |
| `Loop` | Iterative improvement loop — runs multiple full Algorithm cycles on a target with human review between iterations |
| `Migrate` | Bulk content intake from Obsidian, Notion, Apple Notes — classifies against PAI taxonomy and routes with approval |
| `Optimize` | Autonomous optimization loop — hill-climbs any target using metrics (code) or LLM-as-judge evals (skills/prompts) |
| `Prompting` | Meta-prompting library — Anthropic best practices, Handlebars templates, programmatic prompt generation |
| `Webdesign` | Orchestration layer around Claude Design — programmatic UI design and integration into existing apps |

### Obsidian

| Skill | Description |
|---|---|
| `Qmd` | Semantic vault search (QMD): hybrid BM25 + vector + LLM rerank over your notes, with dedup checks. External `qmd` CLI — `bun install -g qmd`, set `$VAULT_DIR` |
| `ObsidianMarkdown` | Obsidian-flavored markdown conventions — callouts, properties (YAML frontmatter), embeds, wikilinks |
| `ObsidianBases` | Manages Bases (Obsidian's native database views) with a functions reference |
| `ObsidianCLI` | Wraps the `obsidian` CLI to read/create/search notes and develop plugins (requires Obsidian running) |
| `SecondBrain` | Capture → process → distribute lifecycle: `inbox/raw → inbox/ready → domains/<Topic>` with entity ripple into the harvest queue. Splits `$VAULT_DIR` (notes) from `$PAI_DIR` (runtime) |
| `ProjectManagement` | Domain-scoped projects + bidirectional task dashboard (`dashboards/TASKS.md`), Obsidian Tasks-compatible status symbols |
| `DailyRituals` | Weekly planning rituals — week-prep / close / cycle / synthesis layered on SecondBrain's daily layer |

> SecondBrain, ProjectManagement, and DailyRituals operate relative to `$VAULT_DIR` —
> set it to your Obsidian vault (or run from inside it). `Qmd` and `defuddle` (used by
> `/ingest-url`) are external CLIs installed via `bun install -g`.

---

## Vault conventions

The repo root ships an empty Obsidian vault scaffold. Point `$VAULT_DIR` at it (or at
your own vault) and the Obsidian skills operate against these folders:

| Folder | Purpose |
|---|---|
| `inbox/raw/` | Unprocessed captures — web clips, voice notes, raw ideas. A holding pen; nothing is filed here. |
| `inbox/ready/` | Processed captures with full frontmatter, awaiting filing into `domains/` or `bases/`. |
| `plan/` | Daily/weekly plans, ISA artifacts, PRDs. Active work-in-progress. |
| `thinking/` | Working notes, Council/RedTeam outputs, research drafts. Exploratory, never auto-routed. |
| `domains/` | Evergreen knowledge by subject — long-lived notes that compound. One folder per topic, each `{INDEX, 01_PROJECTS, 02_PAGES, 03_ARCHIVE}`. |
| `bases/` | Obsidian Bases files (`.base`) — database views over the vault. |
| `dashboards/` | MOC-style hub notes, `TASKS.md`, daily/weekly dashboards — entry points into the vault. |

**Filing flow:** everything enters via `inbox/raw/` → `/process` shapes it into
`inbox/ready/` with frontmatter → `/distribute` files it to `domains/<Topic>/02_PAGES/`
(or `bases/`). See `SecondBrain` for the full lifecycle.

**Note format:**
- Obsidian YAML frontmatter (`---` block) on every filed note — at minimum `type`,
  `created`, `source`, `tags`. Timestamps are local `YYYY-MM-DD HH:MM AM/PM`, never ISO Z.
- Prefer `[[wikilinks]]` over markdown links inside the vault — they drive entity ripple
  and backlinks.

**Git:** every content folder ships a blanket-ignore `.gitignore` (`*` / `!.gitkeep` /
`!.gitignore`), so your notes stay local and never commit to the public fork. Relax a
folder's `.gitignore` in your own private fork if you want to version its content.

---

## Operational rules

- `bun/bunx` always. Never `npm/npx`.
- TypeScript always.
- Never hardcode install paths. Reference PAI runtime state via `${PAI_DIR}` (the
  framework value `~/.claude/PAI`) and skill tools via `$HOME/.claude/skills/…` (skills are
  siblings of `PAI/`, not under `$PAI_DIR`); otherwise use relative paths.
