# 06: Entry reducer prefactor (no behavior change)

**What to build:** Tidy the keyboard entry reducer so keyboard navigation (ticket 07) can reuse the existing "move the cursor to another cell" path instead of copying it. Users see no change.
- Pull the move-to-another-cell logic out of click handling into one shared step that navigation can call:
  - confirm pending digits
  - shift the target past a just-confirmed insert
  - keep the entry session open within the same column, or end it otherwise
- Remove the repetition the last code review flagged:
  - result/state patching repeated about 8 times
  - the slot under the cursor looked up in three places
  - the duplicate import from the project module
- Rename helpers whose names mislead. For example, the "nothing changed" helper is also called with a changed entry state, and the "push history" result flag clashes with App's own push function.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Clicking a cell and the upcoming navigation inputs can go through one shared "go to this cell" step that owns confirming digits, the insert index shift, and session start/end
- [ ] Result/state patching and the slot-under-cursor lookup each live in one helper
- [ ] Helper and result-field names say what they mean (e.g. "Project unchanged" rather than "unchanged"; "needs undo snapshot" rather than "push history")
- [ ] No reducer test changes behavior: the existing suite passes with at most mechanical renames
- [ ] Type check and lint pass
