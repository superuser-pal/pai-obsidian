# Asset Classes

Every note has a `type:` in its frontmatter. The type drives:

- Classification in `ResolveDomain.ts` (for `/distribute`)
- Entity routing in `KnowledgeRipple.ts` (for typed entity notes in `domains/Knowledge/`)
- Daily reflection categorization (for `/close-day`)

## Five primary types

| Type | When to use | Example title | Heuristic detection |
|---|---|---|---|
| `People` | A note ABOUT a person (not by them) | "Alice Example — meeting notes 2026-05-19" | Wikilink matches `^[A-Z][a-z]+(\s[A-Z][a-z]+)+$` (two-token PascalCase) |
| `Companies` | A note about an organization | "AcmeCorp — Q1 strategy" | Wikilink contains `Corp\|Inc\|Co.\|LLC\|Ltd\|GmbH`; or single-word ALL-CAPS / CamelCase with cap acronym |
| `Ideas` | A discrete concept, hypothesis, or argument | "Zero-knowledge proofs as identity primitive" | Wikilink prefixed `idea:` or note frontmatter.type = Ideas |
| `Research` | An academic paper, study, or formal investigation | "Attention Is All You Need" | Wikilink prefixed `paper:` or `research:`; or arxiv-URL in body |
| `Note` | Generic durable content not fitting above | "How I think about deploys" | Default when no other type signaled |

Plus one workflow-specific:

| Type | When | Example |
|---|---|---|
| `Daily` | One file per day, created by `/open-day` | `plan/19-05-26.md` |

## Frontmatter contract by type

### `People`

```yaml
---
type: People
created: 2026-05-19T14:32:11Z
source: capture
discovered: 2026-05-19T14:32:11Z
tags: [team, engineering]
title: Alice Example
# Optional:
role: Senior Engineer at AcmeCorp
relationship: peer | collaborator | mentor | mentee | other
last_contact: 2026-05-19
related_entities: [[AcmeCorp]], [[Project Spectra]]
---
```

### `Companies`

```yaml
---
type: Companies
created: 2026-05-19T14:32:11Z
source: ingest-url
discovered: 2026-05-19T14:32:11Z
tags: [b2b, infrastructure]
title: AcmeCorp
# Optional:
url: https://acmecorp.example
industry: infrastructure
founded: 2019
stage: series-b
related_entities: [[Alice Example]], [[Bob Co-founder]]
---
```

### `Ideas`

```yaml
---
type: Ideas
created: 2026-05-19T14:32:11Z
source: brain-dump
discovered: 2026-05-19T14:32:11Z
tags: [crypto, identity]
title: Zero-knowledge proofs as identity primitive
# Optional:
maturity: seedling | sapling | tree    # cf. Andy Matuschak's evergreen-notes model
contradicts: [[Centralized SSO]]
supports: [[Self-sovereign identity]]
---
```

### `Research`

```yaml
---
type: Research
created: 2026-05-19T14:32:11Z
source: ingest-url
discovered: 2026-05-19T14:32:11Z
tags: [ml, attention, transformers]
title: Attention Is All You Need
# Optional:
authors: [Vaswani, Shazeer, ...]
venue: NeurIPS 2017
url: https://arxiv.org/abs/1706.03762
my_summary: "..."
---
```

### `Note`

```yaml
---
type: Note
created: 2026-05-19T14:32:11Z
source: capture
discovered: 2026-05-19T14:32:11Z
tags: [process, deploys]
title: How I think about deploys
---
```

### `Daily`

```yaml
---
type: Daily
created: 2026-05-19T08:00:00Z
date: 2026-05-19
source: open-day
discovered: 2026-05-19T08:00:00Z
tags: [daily]
title: 2026-05-19 — Tuesday
# Auto-populated by /open-day:
telos_focus: <pulled from TELOS>
inbox_count: 7
plan_items: []
---
```

## What KnowledgeRipple does with these

When a note in `domains/.../02_PAGES/` contains `[[Alice Example]]`, ripple upserts
a typed entity note at `$VAULT_DIR/domains/Knowledge/alice-example.md`:

```yaml
---
type: person
created: 2026-05-19 02:32 PM
source: secondbrain
seen_in: domains/Work/02_PAGES/2026-05-19-team-sync.md
pending-classification: false
tags: []
related: []
quality: 5
---
# Alice Example
```

The note lives in the vault, visible in Obsidian and indexed by
`bases/Knowledge.base` (which groups by `type:`). Ripple dedups against the whole
vault, so an entity already filed elsewhere is not re-created.

There is no separate `MEMORY/KNOWLEDGE` typed graph or harvest queue (Phase 11:
vault as single source of truth).
