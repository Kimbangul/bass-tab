# Per-measure time signature UI

Status: ready-for-agent

## Problem Statement

Every Measure is locked to 4/4 today: `addMeasure` always calls `createEmptyMeasure()` with no argument, and `MeasureGrid`'s grid width is a hardcoded `TICKS_PER_MEASURE = 16` constant that never looks at `measure.timeSignature`. The domain model (`Measure.timeSignature`, `createEmptyMeasure(timeSignature?)`) already supports arbitrary time signatures — only the UI is missing. ADR-0003's addendum flagged this as a likely near-term addition once the core editing/export loop shipped, which it now has.

## Solution

"+ Add measure" grows two inline dropdowns (numerator, denominator) so the user picks the new measure's time signature at creation time. `MeasureGrid` derives its column count from the measure's own `timeSignature` instead of a hardcoded constant, so each measure shows exactly its own beat count. A measure's time signature is fixed once created — there is no UI to change it afterward.

## User Stories

1. As a user transcribing a song that isn't in 4/4, I want to choose a time signature when adding a new measure, so the grid matches the song's actual meter.
2. As a user, I want a measure's grid to show the right number of columns for its own time signature (e.g. 12 columns for 3/4, not always 16), so I can see and fill exactly one measure's worth of beats.
3. As a user, I want an existing measure's time signature to stay fixed after I add it, so I can't accidentally lose or corrupt its content by resizing its grid later.
4. As a user, I want only valid time signatures to be selectable (no free-text entry), so I can never end up in a broken state.
5. As a user adding several measures of the same non-4/4 signature in a row, I want the dropdowns to remember my last pick as the next default, so I don't have to reselect it every time.
6. As a developer, I want the tick-count-per-measure calculation to be a pure function next to the existing editing logic, so it's unit-tested the same way as the rest of `domain/editing.ts`.

## Implementation Decisions

- **Denominator choices**: exactly `{2, 4, 8, 16}` — matches the existing sixteenth-note tick resolution (`DURATION_TICKS`'s finest unit). A denominator that doesn't evenly divide 16 (e.g. 32) isn't offered, since it would require changing the tick resolution itself.
- **Numerator choices**: 1–32, offered as a dropdown (not free text) to match the denominator's all-dropdown UI and rule out invalid states by construction.
- **Tick count derivation**: a new pure function, e.g. `ticksPerMeasure(timeSignature) = numerator * (16 / denominator)`, added to `src/domain/editing.ts` alongside `DURATION_TICKS`. Always a whole number given the denominator restriction above.
- **`MeasureGrid` change**: replace the hardcoded `const TICKS_PER_MEASURE = 16` with `ticksPerMeasure(measure.timeSignature)`, computed per rendered Measure (each Measure grid can now have a different width).
- **`addMeasure` change**: takes an optional `TimeSignature` argument (defaulting to 4/4, matching `createEmptyMeasure`'s existing default) instead of always calling `createEmptyMeasure()` with no argument.
- **Immutability**: no UI ever edits an existing Measure's `timeSignature` — the two dropdowns only ever feed a *new* measure via `addMeasure`.
- **Dropdown defaults / memory**: the numerator/denominator dropdowns preselect the last value the user picked (local UI state in `App.tsx`, not persisted to `Project`, Save, or auto-save) — a convenience for entering several same-signature measures in a row, reset to 4/4 on page load.

## Testing Decisions

- Unit test `ticksPerMeasure` directly with known inputs: 4/4→16, 3/4→12, 6/8→12, 2/4→8, etc. — same style as `editing.test.ts`'s existing tests.
- Unit test `addMeasure`'s new parameter: given a non-default `TimeSignature`, it returns a Project whose new Measure has that signature and a single whole-measure Rest sized to match (reuses `createEmptyMeasure`'s existing behavior).
- Not unit tested: the two dropdowns' DOM wiring and the "remember last pick" local state — thin UI wiring, same category as `MeasureGrid`'s existing untested DOM handling.

## Out of Scope

- Changing an existing measure's time signature after creation.
- Denominators that don't evenly divide 16 (would require changing the tick resolution itself).
- A persisted "default time signature for new projects" setting — the dropdown memory above is a session-only UI convenience, not a stored preference.
- Undo/Redo for adding a measure with a non-default time signature — covered by the separate `.scratch/undo-redo/` spec; that spec treats it as just another undoable action.

## Further Notes

- Closes the first of the two "likely near-term" items ADR-0003's addendum named (the other is Undo/Redo, spec'd separately in `.scratch/undo-redo/`).
- Assumes `src/domain/project.ts`'s `TimeSignature` type and `src/rendering/projectToScore.ts`'s adapter are unchanged — AlphaTab already renders whatever `Measure.timeSignature` says; only the editor-side UI and grid width are new.
