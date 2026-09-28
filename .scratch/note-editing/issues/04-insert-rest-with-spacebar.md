# 04 — Insert a Rest with the spacebar

**What to build:** Targeting an empty grid cell and pressing Space inserts a Rest there instead of a Note, at the current default duration.

**Blocked by:** 01 — needs the empty-cell targeting from the foundational slice; does not need Note selection (ticket 02).

**Status:** ready-for-agent

- [ ] Targeting an empty cell and pressing Space places a Rest of the current default duration there
- [ ] The Rest appears on the grid and the AlphaTab view re-renders
- [ ] The rest-placement logic is a pure function over `Project`/`Measure` (`placeRestAt`), unit-tested independently of the UI
