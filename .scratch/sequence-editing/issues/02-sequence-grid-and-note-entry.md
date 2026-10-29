# 02: Sequence grid + Note entry (tracer bullet)

**What to build:** Switch the editor to the sequence model (ADR-0006).
- Each Measure's grid shows one column per Note or Rest, whatever its duration:
  - a duration label above each column
  - a Note's fret on its string's row
  - a Rest as one mark across all four rows
  - an append column (+) at the end
- Typing a fret and pressing Enter appends a Note (on the append column) or replaces the selected column with a Note that keeps that column's duration. The cursor then moves to the next column of the same Measure.
- A new Measure starts empty.
- No column is ever disabled, and nothing is overwritten or backfilled.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The keyboard entry reducer is introduced as a pure `(entry state, input) → (entry state, Project, push-history?)` module. In this ticket it handles digits, Enter, select-cell and blur, and it is built test-first
- [ ] Digits + Enter on the append column appends a Note using the last used duration, which starts at 1/16
- [ ] Digits + Enter on an existing column replaces it with a Note on the selected string and keeps the column's duration
- [ ] After Enter the cursor is on the next column. At the end of a Measure it stays on that Measure's append column, and no Measure is created
- [ ] Blur or selecting another cell while digits are pending confirms the Note, as Enter does, without moving the cursor. An empty confirm changes nothing
- [ ] A Measure can hold more Notes than its time signature implies, with nothing blocked or flagged
- [ ] Add measure creates an empty Measure. The time-signature picker still sets its label
- [ ] Domain editing functions work by position (replace, insert, remove, set duration), are tested first, and the tick, overwrite and backfill logic and its tests are removed (including the per-time-signature tick count)
- [ ] Projects saved under the old grid load and display as sequences, with no migration
- [ ] Each confirmed entry is one undo step
