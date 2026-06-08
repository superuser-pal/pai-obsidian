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
   grep "\"ts\":\"${today}T" .claude/PAI/MEMORY/OBSERVABILITY/secondbrain-ingest.jsonl
   ```
4. **Aggregate counts** by action:
   - `captured` (capture + brain-dump + quick-dump + save + ingest-url)
   - `processed` (process action count)
   - `distributed` (distribute action count)
   - `harvest_stubs` (ripple action count)
5. **Compose the reflection** (LLM call here — keep it short, three bullets max):
   - **Highlights:** what notable content landed.
   - **Loose threads:** items still in `inbox/raw/` or `inbox/ready/`.
   - **Surprises:** unexpected patterns from the events.
6. **Append to LEARNING/REFLECTIONS:**
   ```bash
   mkdir -p .claude/PAI/MEMORY/LEARNING/REFLECTIONS
   cat >> .claude/PAI/MEMORY/LEARNING/REFLECTIONS/secondbrain-close-day.jsonl << EOF
   {"ts":"$(date -u +%FT%TZ)","date":"$today","captured":$C,"processed":$P,"distributed":$D,"harvest_stubs":$H,"highlights":[...],"loose_threads":[...],"surprises":[...]}
   EOF
   ```
7. **Append to today's plan file** under "What landed today" — replace
   the placeholder with the formatted summary.
8. **Surface escalations** — for each harvest-queue stub created today with
   `pending-classification: true`, mention it explicitly. The user may want to
   classify before PAI's `KnowledgeHarvester.ts` defaults it to Ideas.
9. **Log:**
   ```
   bun .claude/skills/SecondBrain/Tools/IngestLog.ts --action close-day --source-note plan/<DD-MM-YY>.md
   ```
10. **Report** the path to the updated plan file + reflection summary.

## What we deliberately do NOT do

- Auto-archive untouched inbox items. They sit until processed.
- Auto-merge harvest-queue stubs. PAI's harvester owns that step.
- Push notifications. The DA handles voice/notification at its own layer.

## Idempotent

Re-running on the same date appends a NEW jsonl line and rewrites the "What
landed today" section. No data lost; the reflection just gets refreshed.
