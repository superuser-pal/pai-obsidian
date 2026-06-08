# WeeklySynthesis — cross-session weekly synthesis

Performs a synthesis of vault activity, goal alignment, and patterns from
the past 7 days. Called internally by `WeekClose.md` step 4.

## Steps

### 1. Gather the week's activity

Automated — no user input needed:

```bash
git log --since="7 days ago" --oneline --no-merges
```

- Enumerate notes modified in the past 7 days (`git log --name-only --since=…`)
- Read `domains/Work/01_PROJECTS/` for status changes
- `# EXPANSION: restore when domains/Work/02_1-1/ exists` — read 1:1 notes
  from this week
- `# EXPANSION: restore when domains/Work/03_INCIDENTS/ exists` — list new
  or updated incidents

### 2. Goal alignment

`PRINCIPAL_TELOS.md` is already in session context (auto-loaded via
CLAUDE.md `@`-import). Compare actual activity against the current focus:

- **Aligned work** — which Active Goals / Strategies got attention this week?
- **Drift** — work that doesn't map to any stated goal (flag it)
- **Silent goals** — focus items with zero activity this week
- **Emerging themes** — patterns suggesting a focus shift

### 3. Cross-day patterns

Look across the week's notes for:

- Recurring themes (same topic in multiple notes or days)
- Multiple issues touching the same system/component
- Topics appearing in BOTH project notes and inbox captures (strong signals)
- Evolving context (decisions that shifted, deepening understanding)

### 4. Uncaptured wins

Surface achievements not yet in `domains/Work/01_PROJECTS/WINS.md`. Create
`WINS.md` if it does not exist (simple flat log: bullet per win, dated).

`# EXPANSION: restore when domains/Work/02_1-1/ exists` — also scan 1:1
notes for feedback / kudos worth promoting.

### 5. Competency signals

`# EXPANSION: restore when domains/Work/05_REVIEW/COMPETENCIES.md exists` —
check which competencies were exercised this week (based on note links and
content), and confirm evidence is correctly linked. Present as a compact
table: *Competency · Exercised (Y/N) · Linked (Y/N)*.

For now, skip this step — there is no PAI equivalent of the COMPETENCIES
review file yet.

### 6. Forward look

Identify upcoming priorities:

- Blocked items from active project notes
- Deadline-driven tasks
- Goals from PRINCIPAL_TELOS needing immediate attention

### 7. Outcome

Present the synthesis to the user before retrospective or planning runs.
Include a suggested priority ordering for the next week.
