# Harvest Workflow

Manual full qmd reindex + knowledge-graph health check. Not a user-facing
command — invoke when you suspect the qmd index is stale.

## When to use

- After bulk content imports (e.g., `Migrate` skill run).
- After manual `mv`/`rm` operations on vault content (where individual workflows didn't fire).
- Suspected index drift (qmd query results don't match disk reality).
- Periodic maintenance (weekly, monthly — user's call).

## Steps

1. **Full qmd reindex:**
   ```bash
   qmd update                    # re-scan all configured collections
   qmd embed                     # refresh vector embeddings for any changed docs
   ```
   Both commands report counts (new / updated / unchanged / removed).

2. **Knowledge-graph health check** (Phase 11: entities are typed vault notes,
   not a separate queue):
   ```bash
   bun .claude/PAI/TOOLS/KnowledgeHarvester.ts status
   ```
   Reports entity counts by type, quality buckets, orphan wikilinks, and stale
   low-quality notes. Browse/query the graph via `bases/Knowledge.base`.

3. **Report:**
   - qmd update: new/updated/unchanged/removed counts.
   - qmd embed: chunks/docs.
   - Knowledge status: entity counts, orphans, stale notes.

## Boundary

Harvest is read-mostly. It does NOT:
- Rewrite vault content.
- Re-classify entity `type:` (the user owns that).
- Decide what's stale in `domains/`.

## Embedding cost

`qmd embed` runs an LLM-call-per-chunk. Roughly 56s for 33 docs / 138 chunks on
the reference setup (M-series Mac, hf:embeddinggemma-300M-GGUF). Budget
accordingly — embedding the full vault on a slow machine can take minutes.
