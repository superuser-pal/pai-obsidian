# pai-obsidian Fork — Backlog (PRs 2–8)

See `OBSIDIAN_FORK_PLAN.md` for the three-tier architecture overview and phases 1–7.
This file tracks the lean-down PR sequence on the `obsidian-edition` branch.

---

## Pack inventory — decide what to cut in PRs 2–3

52 active Packs. Mark your verdict in the PR column before executing PRs 2–3.
Note: `Algorithm` is not a Pack directory — it's the orchestration layer inside `.claude/`. `Silas` does not exist in this repo.


| Pack                    | Verdict         | Description                                                                                                                                                                            | Use cases                                                                                                                                               |
| ------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Agents`                | **KEEP**        | Compose custom one-shot parallel agents from Base Traits + Voice + Specialization. NOT for coordinated teams (that's Delegation).                                                      | Spin up 3 agents with distinct identities to attack the same problem from different angles. Not the same as multi-turn team coordination.               |
| `ApertureOscillation`   | **KEEP**        | 3-pass scope oscillation — narrow/tactical, wide/strategic, synthesis — to surface design tensions invisible at any single zoom level.                                               | Deciding if a feature fits its system, or when architecture feels locally right but globally off.                                                       |
| `Aphorisms`             | **KEEP**        | Curated quote/aphorism collection with CRUD, themed search, author research, and newsletter usage tracking.                                                                            | Finding and managing quotes for newsletters or writing. Prevents repeating the same quote.                                                              |
| `Apify`                 | **KEEP**        | Social media and e-commerce scraping via Apify actors — Instagram, LinkedIn, TikTok, YouTube, Facebook, Google Maps, Amazon.                                                          | Lead generation, competitive social monitoring, business intelligence across platforms via API.                                                         |
| `ArXiv`                 | REMOVE          | Search and retrieve arXiv academic papers by topic or ID, with AI-generated overviews from AlphaXiv.                                                                                   | Tracking latest AI/ML research, finding papers on a topic, or getting a summary of a specific paper.                                                    |
| `Art`                   | **KEEP**        | Generate static visual content via Flux, Gemini, and GPT-Image — blog headers, diagrams, infographics, thumbnails, icons, Discord bot integration.                                    | Creating illustrations, diagrams, or thumbnails for content. 39 MB of bundled example images.                                                           |
| `AudioEditor`           | **KEEP**        | AI-powered audio cleanup pipeline: Whisper transcription → Claude cut classification → ffmpeg editing with crossfades.                                                               | Cleaning podcast recordings or interview audio — removing filler words, dead air, and stutters before publishing.                                      |
| `BeCreative`            | **KEEP**        | Divergent ideation using Verbalized Sampling + extended thinking for 1.6–2.1× diversity increase. Generates 5 internally diverse candidates or expands seed corpora.                 | Getting genuinely different approaches, creative angles on a topic, or naming something. Single-pass, not evolutionary.                                 |
| `BitterPillEngineering` | **KEEP**        | Audits Claude Code instruction sets for over-prompting — applies "would a smarter model make this rule unnecessary?" to every rule, classifies as CUT/KEEP/SHARPEN.                   | Trimming a bloated CLAUDE.md or PAI setup after it's grown too large. Very useful for maintaining this fork.                                            |
| `BrightData`            | REMOVE          | 4-tier progressive web scraping: WebFetch → curl → headless browser → Bright Data residential proxy (CAPTCHA bypass, paid).                                                         | Scraping a URL that's behind bot detection or JavaScript rendering, escalating only as far as needed.                                                   |
| `Browser`               | **KEEP**        | Headless browser automation via agent-browser Rust CLI daemon with persistent auth profiles and parallel sessions.                                                                     | Batch screenshots, parallel page extraction, or dev server testing without real-browser overhead.                                                       |
| `ContentAnalysis`       | **KEEP**        | Umbrella skill that routes wisdom/insight extraction requests to ExtractWisdom.                                                                                                        | Entry point for "extract insights from this video/podcast/article" — delegates to ExtractWisdom.                                                       |
| `ContextSearch`         | **KEEP**        | Searches prior Claude Code session work — PRDs, git history, session names — to recover context between sessions.                                                                    | Starting a new session on a task you've worked on before, so the AI picks up where you left off without re-explaining.                                  |
| `Council`               | **KEEP**        | Multi-agent collaborative debate — custom-composed agents run 3 rounds with genuine intellectual friction and produce a synthesis.                                                    | Getting multiple expert perspectives on an architecture decision, strategy, or product direction before committing.                                     |
| `CreateCLI`             | **KEEP**        | Generates production-ready TypeScript CLIs with 3-tier templates (zero-dep Bun → Commander.js → oclif), including full docs.                                                         | Wrapping any API or data transformer as a CLI tool. Useful for dev tooling, not directly for Obsidian notes.                                            |
| `CreateSkill`           | **KEEP**        | Full PAI skill lifecycle: scaffold, validate, test effectiveness, improve, optimize trigger descriptions.                                                                              | Building new Claude Code skills that follow PAI conventions, or fixing skills that misfire or over-trigger.                                             |
| `Daemon`                | **KEEP**        | Manages a public "daemon profile" — aggregates PAI sources, applies security filtering, and deploys to Cloudflare Pages.                                                              | Publishing a sanitized public profile of your current work and thinking. Requires Cloudflare setup.                                                     |
| `Delegation`            | **KEEP**        | Parallelizes work via 6 patterns: built-in agents, worktree isolation, background agents, custom agents, agent teams, parallel dispatch.                                               | Auto-invoked by Algorithm when 3+ workstreams exist. Useful for large multi-file changes or parallel research.                                          |
| `Evals`                 | **KEEP**        | AI agent evaluation framework — code-based, model-based, and human graders. Evaluates transcripts, tool calls, and multi-turn conversations.                                          | Benchmarking agent quality, running regression tests, or comparing two prompt versions before shipping.                                                 |
| `ExtractWisdom`         | **KEEP**        | Content-adaptive wisdom extraction — detects what domains are present and builds custom sections. Five depth levels from Instant to Comprehensive.                                    | Extracting the best ideas from any YouTube video, podcast, article, or interview with dynamic, content-shaped output.                                   |
| `Fabric`                | **KEEP**        | Executes 240+ specialized prompt patterns natively — extract_wisdom, threat_model, analyze_claims, improve_writing, create_mermaid, and more.                                         | Applying well-tested extraction/analysis patterns to any content. Best-in-class versions of common prompt tasks.                                        |
| `FirstPrinciples`       | **KEEP**        | Physics-based reasoning (Musk methodology) — deconstruct to irreducible truths, classify hard vs. soft constraints, reconstruct from fundamentals.                                    | Challenging inherited assumptions in a design, pricing model, or process to find what's actually immutable vs. habitual.                                |
| `ISA`                   | **KEEP**        | Manages the Ideal State Artifact — universal project spec that articulates "done," drives the build, and verifies it. Auto-invoked by Algorithm.                                      | Scaffolding a project specification, checking completeness, or seeding a spec from an existing repo's README and commits.                               |
| `Ideate`                | **KEEP**        | Evolutionary ideation engine — 9-phase cycle (consume, dream, steal, mate, test, evolve) with Lamarckian meta-learning across multiple cycles.                                        | Hard creative problems where a single brainstorm pass isn't enough and you need genuinely novel breakthroughs over time.                                |
| `Interceptor`           | REMOVE          | Real Chrome browser automation via an extension with zero CDP fingerprint — passes bot detection, stays logged in, records/replays flows.                                             | Visually verifying deploys, reproducing bugs on authenticated pages, or QA testing web forms. Requires a Chrome extension install.                      |
| `Interview`             | **KEEP**        | Phased conversational interview across all PAI context files — reviews TELOS, IDEAL_STATE, preferences, and identity in completeness order.                                           | Quarterly context refresh of the PAI personal context system. Only useful if USER/ TELOS is populated.                                                  |
| `Investigation`         | **KEEP**        | Umbrella skill routing OSINT requests to structured entity/company intelligence (OSINT sub-skill) and people-finding (PrivateInvestigator sub-skill).                                  | Entry point for "research this company" or "find this person" — delegates to the appropriate sub-skill.                                                |
| `IterativeDepth`        | **KEEP**        | Structured multi-angle exploration — 2–8 sequential passes from different scientific lenses to surface hidden requirements. Finds 30–50% more criteria than direct analysis.        | Running before any important build at Extended effort — the single highest-value thinking technique for the OBSERVE phase.                             |
| `Knowledge`             | **KEEP**        | Manages a typed Knowledge Archive (People, Companies, Ideas, Research) with search, ingest, graph traversal, and context retrieval.                                                    | Building a structured, cross-linked knowledge base that persists across sessions and can be queried by topic.                                           |
| `Loop`                  | KEEP            | Iterative improvement loop — runs multiple full Algorithm cycles on a target with human review between iterations.                                                                    | Incrementally refining a skill, document, or artifact toward an ideal state. Useful but not Obsidian-specific.                                          |
| `Media`                 | **KEEP**        | Umbrella skill routing to Art (illustrations/diagrams) and Remotion (video/animation). Removable if both sub-skills are removed.                                                       | Entry point for visual and video content. Remove this alongside Art and Remotion.                                                                       |
| `Migrate`               | KEEP            | Bulk content intake — chunks external content, classifies against PAI destination taxonomy, routes with approval loop. Handles Obsidian/Notion exports.                               | Importing content from other tools (Obsidian, Notion, Apple Notes, old CLAUDE.md files) into the PAI structure.**Actually relevant to Obsidian users.** |
| `Optimize`              | **KEEP**        | Autonomous optimization loop — hill-climbs any target using metrics (code) or LLM-as-judge evals (skills/prompts).                                                                    | Autonomously improving code performance, bundle size, or skill quality without manual iteration.                                                        |
| `PAIUpgrade`            | REMOVE          | Generates prioritized PAI upgrade recommendations via 4 parallel threads: prior-work audit, user context, Anthropic releases, internal reflections.                                    | Discovering new Claude features relevant to your setup. Upstream-focused, not needed in a fork.                                                         |
| `PrivateInvestigator`   | REMOVE          | Ethical people-finding via 15 parallel research agents across aggregators, social media, public records, and reverse lookups.                                                          | Reconnecting with lost contacts or verifying identity from public records. Unrelated to note-taking.                                                    |
| `Prompting`             | **KEEP**        | Meta-prompting library — Anthropic Claude best practices, Handlebars templates, and tools for programmatic prompt generation and optimization.                                        | Writing system prompts, agent briefings, eval judges, or any prompt-engineering work.                                                                   |
| `RedTeam`               | KEEP            | Military-grade adversarial analysis — deploys 32 parallel expert agents to stress-test ideas, strategies, and plans. Finds weaknesses with remediation paths.                         | Attacking a plan, strategy, or design from every angle before committing. Very useful for thinking work, not specifically web/scraping.                 |
| `Remotion`              | REMOVE          | Programmatic video creation with React/Remotion — compositions and motion graphics rendered to MP4.                                                                                   | Animating content or creating explainer videos. No Obsidian relevance.                                                                                  |
| `Research`              | **KEEP**        | Comprehensive research in quick/standard/extensive/deep modes with multi-agent parallel investigation and content retrieval.                                                           | Primary entry point for any web-based research task — the backbone of knowledge gathering.                                                             |
| `RootCauseAnalysis`     | **KEEP**        | Structured incident investigation using Five Whys, Fishbone, Postmortem, Fault Tree, and Kepner-Tregoe methods.                                                                        | After any significant failure, recurring bug, or incident — finding the actual structural cause rather than the proximate one.                         |
| `Sales`                 | KEEP            | Transforms product documentation into sales narratives + charcoal sketch visuals + talking points.                                                                                     | Converting technical docs into pitch-ready sales packages. Not relevant to personal knowledge work.                                                     |
| `Science`               | **KEEP**        | The scientific method as a universal problem-solving algorithm — goal, hypotheses, experiments, measurement, iteration.                                                               | Figuring out how something works, debugging a complex issue, or validating any hypothesis systematically.                                               |
| `Scraping`              | KEEP            | Umbrella skill routing to BrightData (URL scraping) and Apify (social platform scraping). Remove alongside both sub-skills.                                                            | Entry point for web scraping. Remove with BrightData and Apify.                                                                                         |
| `Security`              | KEEP            | Umbrella skill routing to recon, web app assessment, prompt injection testing, security news monitoring, and annual report analysis.                                                   | Security assessments, threat modeling, LLM jailbreak testing, and security research. Not Obsidian-specific but potentially useful.                      |
| `SystemsThinking`       | **KEEP**        | Structural analysis of complex systems — causal loop diagrams, archetype matching, Meadows' leverage points, iceberg model.                                                           | Understanding why the same problem keeps recurring, or finding where a small change produces a large structural result.                                 |
| `Telos`                 | **KEEP**        | Life OS and project analysis — goals, beliefs, wisdom, books, ideal state, dependencies, and project dashboards.                                                                      | Managing and querying personal context (missions, goals, challenges, preferences). Foundation for the USER/ layer.                                      |
| `Thinking`              | **KEEP**        | Umbrella skill routing all analytical and creative thinking modes to the right sub-skill (FirstPrinciples, IterativeDepth, BeCreative, Council, RedTeam, WorldThreatModel, Science).   | Entry point for any thinking task — "think about X", "brainstorm Y", "council on Z". Delegates to the right tool.                                      |
| `USMetrics`             | KEEP            | 68 US economic indicators from FRED, EIA, Treasury, BLS, Census APIs with trend analysis and cross-metric correlation.                                                                 | Tracking macroeconomic conditions — GDP, inflation, unemployment, gas prices. US-specific data only.                                                   |
| `Utilities`             | **KEEP** (trim) | Mega-umbrella routing developer utilities to CreateCLI, CreateSkill, Delegation, PAIUpgrade, Evals, Documents, Parser, AudioEditor, Fabric, Cloudflare, Browser, Prompting, Aphorisms. | Entry point for all dev tooling.**Routes to removed packs — must be updated after PR 2+3 to remove dead routes.**                                      |
| `Webdesign`             | KEEP            | Orchestration layer around Claude Design (claude.ai/design) driven via Interceptor — programmatic UI design and integration into existing apps.                                       | UI design, prototyping, design-to-code. Requires Interceptor + chrome.ai/design access.                                                                 |
| `WorldThreatModel`      | KEEP            | Persistent world-model harness testing ideas/strategies/investments against 11 time horizons (6 months to 50 years) with RedTeam + FirstPrinciples.                                    | Stress-testing any important decision against possible futures — useful for strategic thinking, not Obsidian-specific.                                 |
| `WriteStory`            | KEEP            | Layered fiction writing system across 7 narrative dimensions, grounded in Will Storr and Mark Forsyth's rhetorical frameworks.                                                         | Writing novels, short stories, or long-form fiction with structured character arcs. Not relevant to note-taking.                                        |

**⚠️ Note on umbrella packs:** `ContentAnalysis`, `Investigation`, `Media`, `Scraping`, `Security`, `Thinking`, and `Utilities` are router-only packs that delegate to sub-skills. If sub-skills are removed, these packs need their routing tables updated or should be removed too.

After PRs 2+3 the expected kept set (~23–25 packs):
`ApertureOscillation`, `ArXiv`, `BeCreative`, `ContentAnalysis`, `ContextSearch`, `Council`, `CreateSkill`, `ExtractWisdom`, `Fabric`, `FirstPrinciples`, `ISA`, `Ideate`, `Investigation`, `IterativeDepth`, `Knowledge`, `Optimize`, `Prompting`, `Research`, `RootCauseAnalysis`, `Science`, `SystemsThinking`, `Telos`, `Thinking`, `Utilities` (trimmed)

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
