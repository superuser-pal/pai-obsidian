# Command Reference

Full per-command behavior for the ten user-facing slash commands. Each command
is a thin wrapper that routes to a Workflow in this skill.

## `/capture <content>` — drop into inbox/raw

- **Input:** text, URL, or `--file <path>`. Plus `--thinking` to route to `thinking/` instead.
- **Behavior:**
  1. If input is a URL → call `defuddle <url>` to extract clean markdown.
  2. If input is `--file` → read file contents; preserve original if `--keep`.
  3. Otherwise → use text as-is.
  4. Slugify a filename (`YYYY-MM-DD-<slug>.md`).
  5. Write to `inbox/raw/<slug>.md` (or `thinking/<slug>.md` with `--thinking`).
  6. Log `{action: capture, source_note}` to ingest jsonl.
- **Output:** path to the file created.
- **Does NOT:** add frontmatter, classify, distribute, or ripple entities. Pure capture.

## `/brain-dump <content>` — atomic observation extraction

- **Input:** freeform text containing `[category]` markers.
- **Behavior:**
  1. Split input on `[category]` markers — each becomes a separate observation.
  2. For each observation, write `inbox/raw/<YYYY-MM-DD>-<slug>-<n>.md`.
  3. Tag each file with its `[category]` as a frontmatter tag.
  4. Log one event per file.
- **Output:** list of files created.
- **Example input:**
  ```
  [idea] Could compress prompts via shared cache keys.
  [observation] Latency spikes at 14:00 — likely cron load.
  [todo] Email Bob about the deploy.
  ```

## `/quick-dump <content>` — classify + route + ripple

Like `/save` but faster and less interactive — meant for high-throughput dumping.

- **Input:** text or URL.
- **Behavior:**
  1. Classify content type (Note, Idea, Research, etc.) via heuristics + LLM if needed.
  2. Pick target domain via `ResolveDomain.ts`.
  3. Write directly to `domains/<T>/02_PAGES/<slug>.md` with minimal frontmatter.
  4. Run `KnowledgeRipple.ts` on the file.
  5. Skip the `inbox/raw → ready` two-step.
- **Output:** target file path + ripple summary.
- **Use when:** you trust the classifier and want one-step routing.

## `/save <content>` — light edit + classify + dedup + wikilinks + ripple

The "considered" version of quick-dump.

- **Input:** text, URL, or file path.
- **Behavior:**
  1. Light edit pass on the content (typo fix, paragraph break sanity).
  2. `qmd query <title>` → check for duplicates; if ≥80% match, prompt to merge.
  3. Auto-insert `[[wikilinks]]` for recognized entities found via qmd matches.
  4. Add frontmatter.
  5. `ResolveDomain.ts` → write to target.
  6. `KnowledgeRipple.ts`.
- **Output:** file path + summary of edits + dedup status.

## `/process` — promote raw → ready

- **Input:** none (operates on `inbox/raw/*`).
- **Behavior:**
  1. Run `QmdUpdate.ts` (refresh index).
  2. For each file in `inbox/raw/`:
     - Read content + parse any existing frontmatter.
     - Run `LintFrontmatter.ts` (advisory, never blocks).
     - Add missing fields: `type`, `created`, `source`, `discovered`, `tags`, `title`.
     - Move to `inbox/ready/<name>`.
     - `QueueUpdate.ts add <relpath>` — appears in pending queue.
     - `IngestLog.ts --action process`.
  3. Report files processed.
- **Output:** count + list of newly-ready files.

## `/distribute` — promote ready → domain page

- **Input:** none (operates on `inbox/ready/*`). Or `--file <path>` for a single file.
- **Behavior:**
  1. Run `QmdUpdate.ts`.
  2. For each file in `inbox/ready/`:
     - Snapshot to `MEMORY/ARCHIVE/secondbrain-snapshots/`.
     - `ResolveDomain.ts` → target domain.
       - If `unclear`: prompt user; show top candidates.
     - Move to `domains/<T>/02_PAGES/<name>`.
     - Append `distributed: <ISO>`, `domain: <T>` to frontmatter.
     - `KnowledgeRipple.ts` → typed entity notes in `domains/Knowledge/`.
     - **Cascade preview** (NOT auto-applied):
       - `qmd query [[<title>]]` → find related pages.
       - Show user the proposed cross-link updates; user confirms each.
     - `QueueUpdate.ts complete <src> --target <dst>`.
     - `IngestLog.ts --action distribute`.
  3. Report files distributed + cascade decisions.

## `/ingest-url <url>` — defuddle → process → distribute chain

- **Input:** URL.
- **Behavior:**
  1. `defuddle <url>` → clean markdown.
  2. Write to `inbox/raw/<YYYY-MM-DD>-<slug>.md`.
  3. Chain into `/process` for that single file.
  4. Chain into `/distribute` for that single file.
- **Output:** final domain page path.
- **Use when:** you want the whole lifecycle in one shot, no inbox dwell time.

## `/open-day [--date YYYY-MM-DD]` — morning ritual

- **Input:** optional date (default today).
- **Behavior:**
  1. Create `plan/<DD-MM-YY>.md` if not exists, with `type: Daily` frontmatter.
  2. Pull current TELOS focus from `.claude/PAI/USER/TELOS/`:
     - Active mission(s), top goals, key challenges.
  3. List items in `inbox/raw/` and `inbox/ready/` (count + titles).
  4. List queue pending (`QueueUpdate.ts list --pending`).
  5. Append a "Today's intent" section template.
  6. Open the daily file in the user's editor (Obsidian if running).
- **Output:** path to today's file.

## `/close-day` — evening reconcile

- **Input:** none.
- **Behavior:**
  1. Read today's `plan/<DD-MM-YY>.md`.
  2. Read recent events from `secondbrain-ingest.jsonl` (today's actions).
  3. Compose a reflection summary: what landed, what's still in inbox, surprises.
  4. Append one JSON line to `MEMORY/LEARNING/REFLECTIONS/secondbrain-close-day.jsonl`:
     ```json
     {"ts":"...","date":"...","captured":7,"processed":5,"distributed":4,
      "highlights":["..."],"open_items":["..."]}
     ```
  5. Surface any typed entities discovered today that should be added to
     PAI's typed graph beyond what KnowledgeRipple already queued.

## `/create-domain <Name>` — scaffold a new topical area

- **Input:** domain name (PascalCase recommended).
- **Behavior:**
  1. `mkdir -p domains/<Name>/{01_PROJECTS,02_PAGES,03_ARCHIVE}`.
  2. Write `domains/<Name>/INDEX.md`:
     ```markdown
     ---
     type: Note
     created: <ISO>
     title: <Name>
     domain: <Name>
     ---
     # <Name>

     _Topical home for <Name>-related content. Distributed by /distribute._

     ## Projects
     ## Pages
     ## Archive
     ```
  3. Add `.gitkeep` to each subfolder so they survive in git.
  4. Optionally update parent `domains/INDEX.md` if it exists.
- **Output:** path to the new domain INDEX.

## Reference: workflow files

Each command's actual implementation lives in `Workflows/<Name>.md`:

| Command | Workflow |
|---|---|
| `/capture` | [Capture.md](../Workflows/Capture.md) |
| `/brain-dump` | [BrainDump.md](../Workflows/BrainDump.md) |
| `/quick-dump` | [QuickDump.md](../Workflows/QuickDump.md) |
| `/save` | [Save.md](../Workflows/Save.md) |
| `/process` | [Process.md](../Workflows/Process.md) |
| `/distribute` | [Distribute.md](../Workflows/Distribute.md) |
| `/ingest-url` | [IngestUrl.md](../Workflows/IngestUrl.md) |
| `/open-day` | [OpenDay.md](../Workflows/OpenDay.md) |
| `/close-day` | [CloseDay.md](../Workflows/CloseDay.md) |
| `/create-domain` | [CreateDomain.md](../Workflows/CreateDomain.md) |

Plus one not exposed as a command:

| Workflow | When to invoke |
|---|---|
| [Harvest.md](../Workflows/Harvest.md) | Manual full reindex — `qmd embed` + knowledge-graph health check |
