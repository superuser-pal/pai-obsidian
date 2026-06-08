# IngestUrl Workflow

End-to-end URL ingestion: `defuddle` → `inbox/raw/` → `/process` → `/distribute`,
all in one command. No inbox dwell time.

## Steps

1. **Validate input** — must be a URL (`http://` or `https://`).
2. **Run defuddle:**
   ```bash
   defuddle "$URL" --markdown > /tmp/defuddle-out.md
   ```
   - Capture stdout as the content.
   - If exit code non-zero: surface the error, halt.
   - If output empty: fall back to writing the URL itself with `tags: [needs-retrieval]`.
3. **Capture** the markdown via [Capture.md](Capture.md) steps to a single file in `inbox/raw/`.
4. **Process** that single file via [Process.md](Process.md) (single-file scope, not the full inbox).
5. **Distribute** that single file via [Distribute.md](Distribute.md) (single-file scope).
6. **Report:**
   - URL → final domain page path.
   - Defuddle status (extracted bytes, fallback used yes/no).
   - Type assigned, domain assigned.
   - Harvest-queue stubs emitted.
   - Cascade preview decisions.

## Optional flags

| Flag | Effect |
|---|---|
| `--type <T>` | Override automatic type classification (skips heuristic). |
| `--domain <Name>` | Pin the target domain (skips ResolveDomain). |
| `--tags tag1,tag2` | Seed tags before /process generates more. |
| `--no-cascade` | Skip the cascade preview entirely. |
| `--keep-tracking` | Preserve `?utm_*` params (default strips them). |

## Idempotency

Re-ingesting the same URL: defuddle is deterministic enough that the slug
collides. The capture step appends `-1`, `-2`, etc. — duplicates are kept; the
user can prune later via `/save`'s dedup pass on the next URL ingestion.

## Failure modes

| Failure | Behavior |
|---|---|
| URL returns 404 | defuddle reports error; ingest halts before write. |
| Paywall / SPA-rendered content | defuddle returns partial; fallback writes URL with `needs-retrieval` tag. |
| Network down | bun's $ shell call fails; user message + halt. |
| `defuddle` not installed | Pre-flight check at workflow start; suggest `bun install -g defuddle` (external CLI, like `qmd`). |
