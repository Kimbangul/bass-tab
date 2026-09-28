# 02 — Select an existing Note and overwrite its fret

**What to build:** Clicking a grid cell that already holds a Note selects it instead of opening a fresh empty-cell input, and typing digits while it's selected overwrites its fret directly — no separate "edit mode." This introduces the selection concept the later duration-change and delete tickets build on.

**Blocked by:** 01 — needs the grid and `placeNoteAt` from the foundational slice.

**Status:** ready-for-agent

- [ ] Clicking a cell that already holds a Note selects it, shown as visually distinct from unselected cells
- [ ] While a Note is selected, typing digits overwrites its fret (reuses `placeNoteAt` from ticket 01)
- [ ] The AlphaTab view re-renders after the overwrite
- [ ] Selecting a different cell moves the selection; only one cell is selected at a time
