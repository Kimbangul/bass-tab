# 04: Delete and insert columns

**What to build:** Edit a Measure's sequence like a list:
- Backspace/Delete on a selected column with an empty entry removes it, and the later columns move up.
- `I` (or Insert) opens a new column before the cursor, where a Note or Rest can be entered as usual.
- Leaving that new column without entering anything inserts nothing.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Backspace/Delete with an empty entry removes the selected column, and later columns close the gap
- [ ] Backspace/Delete with digits pending only edits the digits, and nothing is removed
- [ ] Backspace/Delete on the append column does nothing
- [ ] `I`/Insert opens a pending column before the cursor. Digits + Enter there inserts a Note, and Space inserts a Rest (once ticket 03 lands)
- [ ] Blur, or an empty confirm, on a pending inserted column leaves the Measure unchanged and records no undo step
- [ ] Remove and insert each count as one undo step
- [ ] All of the above is covered in the reducer's tests, written test-first
