# CloseDay Workflow

Evening reconcile. Compose a reflection summary, append to LEARNING/REFLECTIONS,
surface anything that should escalate beyond the harvest queue.

## Steps

1. **Resolve today's date** (`--date YYYY-MM-DD` or today).
2. **Read today's `plan/<DD-MM-YY>.md`** — preserve its "Today's intent" section
   as input for the reflection.
3. **Read today's ingest events:**
   ```bash
   today=$(date -u +%Y-%m-%d)
   grep "\"ts\":\"${today}T" $PAI_DIR/MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl
   ```
4. **Aggregate counts** by action:
   - `captured` (capture + brain-dump + quick-dump + save + ingest-url)
   - `processed` (process action count)
   - `distributed` (distribute action count)
   - `entities_upserted` (ripple action count — typed notes created in `domains/Knowledge/`)
5. **Compose the reflection** (LLM call here — keep it short, three bullets max):
   - **Highlights:** what notable content landed.
   - **Loose threads:** items still in `inbox/raw/` or `inbox/ready/`.
   - **Surprises:** unexpected patterns from the events.
6. **Append to LEARNING/REFLECTIONS:**
   ```bash
   mkdir -p $PAI_DIR/MEMORY/LEARNING/REFLECTIONS
   cat >> $PAI_DIR/MEMORY/LEARNING/REFLECTIONS/secondbrain-close-day.jsonl << EOF
   {"ts":"$(date -u +%FT%TZ)","date":"$today","captured":$C,"processed":$P,"distributed":$D,"entities_upserted":$H,"highlights":[...],"loose_threads":[...],"surprises":[...]}
   EOF
   ```
7. **Append to today's plan file** under "What landed today" — replace
   the placeholder with the formatted summary.
8. **Surface escalations** — for each entity note created today in
   `domains/Knowledge/` with `pending-classification: true`, mention it
   explicitly. The user may want to correct its `type:` (it defaulted to `idea`).
9. **Log:**
   ```
   bun $HOME/.claude/skills/SecondBrain/Tools/IngestLog.ts --action close-day --source-note plan/<DD-MM-YY>.md
   ```
10. **Report** the path to the updated plan file + reflection summary.

## What we deliberately do NOT do

- Auto-archive untouched inbox items. They sit until processed.
- Auto-correct entity `type:` classifications. The user owns that decision.
- Push notifications. The DA handles voice/notification at its own layer.

## Idempotent

Re-running on the same date appends a NEW jsonl line and rewrites the "What
landed today" section. No data lost; the reflection just gets refreshed.
