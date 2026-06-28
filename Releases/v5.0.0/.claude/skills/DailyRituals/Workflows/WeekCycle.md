# WeekCycle — full weekly transition

Invoked by `/week-cycle`. Orchestrates: close current week → weekly
synthesis → prep next week. Typically run Friday–Sunday.

## Steps

### 1. Check context

- Is there an active week? `grep -l "phase: active" plan/W*.md 2>/dev/null`
- Today's date — warn (but don't block) if it's not Friday–Sunday.

### 2. Close the current week (if active)

If an active week exists, run `Workflows/WeekClose.md` — which itself invokes
`Workflows/WeeklySynthesis.md` as step 4.

If no active week, skip closing.

### 3. Plan the next week

Run `Workflows/WeekPrep.md`.

### 4. Summary

Present a compact summary:

- Week W[x] closed (velocity: N%)
- Week W[x+1] created with [N] committed tasks and goal: "[goal]"
