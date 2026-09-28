# 05 — Delete a selected Note (becomes a Rest)

**What to build:** Deleting a selected Note turns it into a Rest of the same duration in place — per ADR-0004's overwrite model, nothing shifts.

**Blocked by:** 02 — needs Note selection.

**Status:** ready-for-agent

- [ ] Pressing Backspace or Delete while a Note is selected replaces it with a Rest of the same duration
- [ ] No other Note's position or slot in the Measure changes
- [ ] The grid and the AlphaTab view re-render reflecting the change
- [ ] The delete logic is a pure function over `Project`/`Measure` (`deleteNoteAt`), unit-tested independently of the UI
