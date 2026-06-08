# Harvest Workflow

Manual full-reindex + harvest-queue drain. Not a user-facing command — invoke
when you suspect the qmd index is stale or the harvest queue is backlogged.

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

2. **Inspect harvest queue:**
   ```bash
   ls .claude/PAI/MEMORY/KNOWLEDGE/_harvest-queue/ | wc -l
   ```
   - If `<10` items: probably normal, nothing to do.
   - If `>50` items: PAI's `KnowledgeHarvester.ts` may not be running on its
     schedule. Surface to user.

3. **Optionally trigger PAI's harvester:**
   PAI's `KnowledgeHarvester.ts` consumes the queue. Invoke it explicitly:
   ```bash
   bun .claude/PAI/TOOLS/KnowledgeHarvester.ts
   ```
   (See `.claude/PAI/DOCUMENTATION/Memory/MemorySystem.md` for invocation details
   if this command shape changes.)

4. **Report:**
   - qmd update: new/updated/unchanged/removed counts.
   - qmd embed: chunks/docs.
   - Harvest queue before/after.
   - Any entries that look manually-broken (malformed frontmatter, etc.).

## Boundary

Harvest is read-mostly. It does NOT:
- Rewrite vault content.
- Auto-classify queue stubs (that's the harvester's job).
- Decide what's stale in `domains/`.

## Embedding cost

`qmd embed` runs an LLM-call-per-chunk. Roughly 56s for 33 docs / 138 chunks on
the reference setup (M-series Mac, hf:embeddinggemma-300M-GGUF). Budget
accordingly — embedding the full vault on a slow machine can take minutes.
