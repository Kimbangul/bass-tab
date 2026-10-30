# 01 — Grid width driven by a measure's own time signature

**What to build:** The tick-count-per-measure calculation becomes a pure function of `Measure.timeSignature`, and `MeasureGrid` and `addMeasure` use it instead of a hardcoded 16-column assumption. No UI to pick a time signature yet (ticket 02) — this lands the underlying capability, verified by tests.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A pure `ticksPerMeasure(timeSignature)` function exists alongside the domain editing logic (e.g. `src/domain/editing.ts`), returning `numerator * (16 / denominator)`
- [ ] `MeasureGrid` renders each measure's grid using that computed width instead of the hardcoded `TICKS_PER_MEASURE = 16` constant
- [ ] `addMeasure` accepts an optional `TimeSignature` argument, defaulting to 4/4, used when creating the new Measure
- [ ] Existing 4/4 measures render exactly as before (16 columns) — no regression
