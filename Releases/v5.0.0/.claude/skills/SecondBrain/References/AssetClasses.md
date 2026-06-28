# Asset Classes

Every note has a `type:` in its frontmatter. The type drives:

- Entity classification in `KnowledgeRipple.ts` (mapping a content note's `type:` to the
  singular entity vocabulary for typed entity notes in `domains/Knowledge/`)
- Daily reflection categorization (for `/close-day`)

(`ResolveDomain.ts` — used by `/distribute` — routes by `domain:` / path / tags / link-density,
*not* by `type:`.)

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

### Two type vocabularies

There are deliberately **two** type vocabularies, and they must stay mapped:

- **Content notes** use the plural-capitalized types above (`People`,
  `Companies`, `Ideas`, `Research`, `Note`, `Daily`).
- **Entity notes** that `KnowledgeRipple` creates in `domains/Knowledge/` use the
  singular lowercase `type:` — `person | company | idea | research`.

`KnowledgeRipple.classify()` maps a source content note's plural type onto the
singular entity type (`Ideas → idea`, `People → person`, …) when inheriting, so
the documented "note frontmatter.type = Ideas" heuristic actually fires.

## Frontmatter contract by type

> All timestamps below are SecondBrain's local `YYYY-MM-DD HH:MM AM/PM` (never
> ISO Z). All examples carry the lifecycle `status:` — see the
> [Frontmatter contract](../SKILL.md#frontmatter-contract).

### `People`

```yaml
---
type: People
status: processed
created: 2026-05-19 02:32 PM
source: capture
discovered: 2026-05-19 02:32 PM
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
status: processed
created: 2026-05-19 02:32 PM
source: ingest-url
discovered: 2026-05-19 02:32 PM
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
status: processed
created: 2026-05-19 02:32 PM
source: brain-dump
discovered: 2026-05-19 02:32 PM
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
status: processed
created: 2026-05-19 02:32 PM
source: ingest-url
discovered: 2026-05-19 02:32 PM
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
status: processed
created: 2026-05-19 02:32 PM
source: capture
discovered: 2026-05-19 02:32 PM
tags: [process, deploys]
title: How I think about deploys
---
```

### `Daily`

```yaml
---
type: Daily
status: processed
created: 2026-05-19 08:00 AM
date: 2026-05-19
source: open-day
discovered: 2026-05-19 08:00 AM
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
status: processed
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
