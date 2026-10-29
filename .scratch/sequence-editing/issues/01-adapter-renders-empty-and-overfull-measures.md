# 01: AlphaTab adapter renders empty and overfull Measures

**What to build:** Make the score preview survive the kinds of Measures the sequence model will produce. A Measure with no Notes or Rests should render as an empty bar. A Measure whose durations add up to more or less than its time signature should render as-is, not fail. This de-risks the rest of the spec before the grid changes. The current editor's behavior is unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A Measure with zero slots converts to a renderable AlphaTab bar (e.g. one empty beat that exists only in the adapter and is never written back into the Project)
- [ ] A Measure whose slots exceed its time signature (e.g. seven quarter Notes in 4/4) converts with every slot present, in order
- [ ] A Measure whose slots fall short of its time signature converts with only those slots, and nothing is padded into the Project
- [ ] Each case is covered in the adapter's test file, written test-first, asserting on the returned Score shape
- [ ] Check by hand in the running app that AlphaTab actually draws an empty bar and an overfull bar without errors, and note the result in this ticket's Comments

## Comments

- Manual check in the running app (Chrome, after ticket 02 landed):
  - An empty 4/4 Measure draws as a bar holding one rest.
  - A Measure with 3 sixteenths (short) draws as just those 3.
  - A Measure with 18 sixteenths (overfull) draws all 18 in one bar.
  - No console errors from the app in any case.
