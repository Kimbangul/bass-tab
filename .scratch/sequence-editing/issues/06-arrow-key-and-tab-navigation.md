# 06: Arrow-key and Tab navigation

**What to build:** Let the user move the cursor without the mouse:
- **Tab / Shift+Tab** confirm anything typed and always move to the next or previous column, even when nothing changed. Enter is unchanged: it moves only when the entry changed something.
- **←/→** move between columns and **↑/↓** between strings.
- **→/Tab** at a Measure's append column continue into the next Measure. **←/Shift+Tab** at a Measure's first column go back to the previous Measure's append column.
- With nothing selected, an arrow key or Tab selects the last Measure's append column.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The reducer gains `move` (left/right/up/down) and `tab` (with reverse) inputs, built test-first
- [ ] Tab confirms pending digits, then moves one column forward, even when the entry changed nothing. Shift+Tab moves back
- [ ] ←/→ confirm pending digits, then move one column and start a new undo session
- [ ] ↑/↓ change the string within the same column, keep the undo session, and stop at strings 1 and 4 (no wrap)
- [ ] →/Tab from an append column go to the next Measure's column 0. ←/Shift+Tab from column 0 go to the previous Measure's append column
- [ ] The first column of the first Measure and the append column of the last Measure stop the cursor, and no Measure is created
- [ ] Enter still never leaves its Measure
- [ ] Moving off a pending inserted column with nothing entered inserts nothing. With digits entered it confirms the insert, and the cursor lands on the intended column after the shift
- [ ] With nothing selected, an arrow key or Tab selects the last Measure's append column
- [ ] While the editor has focus, Tab and the arrow keys never trigger the browser default (focus change or scroll)
