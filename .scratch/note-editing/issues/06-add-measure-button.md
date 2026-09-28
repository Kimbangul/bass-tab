# 06 — "+ Add measure" button

**What to build:** An explicit control to append a new empty 4/4 Measure to the Project — no measure is ever created automatically.

**Blocked by:** 01 — needs the grid to exist so a new Measure has somewhere to render.

**Status:** ready-for-agent

- [ ] A visible "+ Add measure" control exists
- [ ] Clicking it appends a new, empty 4/4 Measure to the Project (no per-measure time-signature picker — out of scope per ADR-0003)
- [ ] The grid extends to show the new empty Measure, ready for the same click-to-place interactions as any other
- [ ] The measure-creation logic is a pure function over `Project` (`addMeasure`), unit-tested independently of the UI
