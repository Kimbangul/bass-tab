# 08: One sticky duration toolbar, no layout jumps

**What to build:** Stop the grid from jumping when Space or Enter is pressed.

The cause today is that each Measure's toolbar appears when a Note or Rest is selected and disappears otherwise, which pushes the grid up and down. Replace it with one duration toolbar above all Measures. It is always rendered and sticks to the top of the viewport. It is enabled, with the current duration highlighted, when a Note or Rest is selected, and disabled otherwise.

Also, while the editor has focus, Space and Enter never fall through to the browser's default scroll, even with nothing selected (e.g. right after Ctrl+Z).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Exactly one duration toolbar is shown, above the first Measure, whatever is selected
- [ ] It sticks to the top of the viewport while the page scrolls
- [ ] It is enabled with the duration highlighted for a selected Note or Rest, and disabled with nothing selected, on an append column, or on a pending insert
- [ ] Selecting, Space, Enter, and moving between columns or Measures never change the page layout above or around the grid
- [ ] Space and Enter with the editor focused never scroll the page, including when nothing is selected
- [ ] Picking a duration keeps the existing behavior (last used duration, one undo step per entry session, focus stays in the editor)

## Comments

- While implementing: the main cause of the reported jump wasn't the toolbar.
  - It was AlphaTab's cursor auto-scroll, which runs on every re-render even with the player disabled. Logging scroll calls showed the stack trace `VerticalContinuousScrollHandler.doScroll` → `scrollToY`.
  - So every edit (Space, Enter, digits, Delete) scrolled the page down to the score about 1s later.
  - Fixed by setting AlphaTab `player.scrollMode: "off"`.
  - The sticky toolbar still removes the smaller layout jump.
  - Checked in Chrome: 7 edits in a row now produce zero scroll events.
