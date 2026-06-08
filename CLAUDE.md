# pai-obsidian

pai-obsidian is a lean, Obsidian-focused fork of [danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure). It strips upstream machinery (Pulse, the DA daemon, Forge, RTK) and ships only the skills relevant to knowledge work, thinking, and research — with a vault scaffold tuned for Obsidian users. It sits in the middle tier of a three-layer cascade: `PAI upstream → pai-obsidian → your private fork`.

## Installation

Run the installer to wire `.claude/` into your home directory:

```bash
cd Releases/v5.0.0
bash install.sh
```

## Skills

39 skills ship with this fork. The Obsidian group is empty until Phase 3 ports the vault skills.

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

*Skills ported in Phase 3. Empty until then.*

---

## Vault conventions

*Filled in Phase 4 once the vault scaffold is created.*

---

## Operational rules

- `bun/bunx` always. Never `npm/npx`.
- TypeScript always.
- Never hardcode paths — use `${PAI_DIR}` or relative paths.
