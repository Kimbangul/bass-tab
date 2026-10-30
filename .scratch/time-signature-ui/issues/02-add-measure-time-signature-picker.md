# 02 — Time signature picker for Add measure

**What to build:** "+ Add measure" grows a numerator/denominator picker, so the user can choose a new measure's time signature instead of always getting 4/4.

**Blocked by:** 01 — needs the grid-width and `addMeasure` groundwork.

**Status:** ready-for-agent

- [ ] "+ Add measure" is accompanied by a numerator dropdown (1–32) and a denominator dropdown (`{2, 4, 8, 16}`)
- [ ] Clicking "+ Add measure" creates a new Measure using the currently selected time signature
- [ ] The dropdowns default to 4/4 on page load, and after each Add measure keep the last-picked values as the next default
- [ ] An existing measure's time signature is never edited by this UI — the picker only ever affects the next measure added
