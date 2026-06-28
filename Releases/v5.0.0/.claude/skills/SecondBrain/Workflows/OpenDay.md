# OpenDay Workflow

Morning ritual. Creates `plan/<DD-MM-YY>.md` and stages the day's context for the user.

## Steps

1. **Resolve date** (`--date YYYY-MM-DD` or today).
2. **Read TELOS context** from `$PAI_DIR/USER/TELOS/`:
   - `MISSION.md` (top 1–2 missions)
   - `GOALS.md` (active goals)
   - `CHALLENGES.md` (current frictions)
   - `STRATEGIES.md` (in-flight strategies)
   - Plus PRINCIPAL_TELOS.md as the compressed summary.

   The plan §15 originally proposed a separate `NORTH_STAR.md`. v2 dropped it
   — TELOS IS the north star. We pull from PAI's existing files.

3. **Count inbox state:**
   ```bash
   ls inbox/raw/ 2>/dev/null | wc -l
   ls inbox/ready/ 2>/dev/null | wc -l
   ```

4. **Read pending queue:**
   ```
   bun $HOME/.claude/skills/SecondBrain/Tools/QueueUpdate.ts list --pending
   ```

5. **Write `plan/<DD-MM-YY>.md`** (if not exists) with this template:

   Timestamps use the local format (`date +"%Y-%m-%d %I:%M %p"`), never ISO Z —
   the F4 contract, matching AssetClasses §Daily. `status: processed` is required
   (AssetClasses §Daily); without it every `/open-day` note fails F7a.

   ```markdown
   ---
   type: Daily
   status: processed
   created: <date +"%Y-%m-%d %I:%M %p">
   date: <YYYY-MM-DD>
   source: open-day
   discovered: <date +"%Y-%m-%d %I:%M %p">
   tags: [daily]
   title: <YYYY-MM-DD> — <Weekday>
   ---

   # <YYYY-MM-DD> — <Weekday>

   ## TELOS focus

   - **Mission:** <pulled>
   - **Active goals:** <pulled>
   - **Challenges to watch:** <pulled>

   ## Inbox state

   - `inbox/raw/`: <N> files
   - `inbox/ready/`: <M> files (run `/distribute` to land them)
   - Pending queue: <K> items

   ## Today's intent

   _(user fills this in)_

   ## What landed today

   _(autopopulated at /close-day)_
   ```

   If the file already exists: do NOT overwrite. Just open it.

6. **Log:**
   ```
   bun $HOME/.claude/skills/SecondBrain/Tools/IngestLog.ts --action open-day --target-note plan/<DD-MM-YY>.md
   ```

7. **Open the file in Obsidian** if `obsidian` CLI is available:
   ```
   obsidian open plan/<DD-MM-YY>.md
   ```
   (Requires Obsidian running.)

8. **Report** the file path + a one-screen summary of the day's setup.

## Idempotent

Re-running `/open-day` on the same date: reads the existing file, refreshes the
inbox counts in a non-destructive way (only the "Inbox state" section is
rewritten; everything else preserved).
