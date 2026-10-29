# 03: Space: Rest entry, duration cycling, grouped undo

**What to build:** Make "press the same key again to change the length" work for both Notes and Rests.
- With digits pending, Space confirms the Note and keeps it selected.
- With an empty entry on the append column, Space appends a Rest and keeps it selected.
- Each further Space on a selected Note or Rest makes it one step longer. Shift+Space makes it one step shorter.
- A longer column pushes later columns in the Measure later in time and never erases them.
- One Ctrl+Z undoes the whole entry on that column.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The cycle order is 1/16 → 1/8 → 1/4 → 1/2 → 1/1 → 1/16 and wraps. Shift+Space walks the same order backward
- [ ] `5 Space Space Enter` (last used 1/16) gives a fret-5 1/4 Note and leaves the cursor on the next column
- [ ] Space with an empty entry on the append column appends a Rest of the last used duration and keeps it selected
- [ ] Space on an existing Note or Rest with an empty entry cycles its duration
- [ ] Every duration reached by cycling becomes the last used duration for the next new column
- [ ] An entry session (from arriving at a column until the cursor leaves it) asks for exactly one undo snapshot, however many Space presses it includes
- [ ] All of the above is covered in the reducer's tests, written test-first
