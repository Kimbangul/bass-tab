# 01 — Empty starting Project + click-to-place a Note on an empty grid cell

**What to build:** The editor starts from a real, empty Project instead of the hardcoded demo. Each Measure renders as a grid (4 strings × 16 sixteenth-note ticks); clicking an empty cell opens an inline input, and confirming a fret number places a Note there and re-renders the existing AlphaTab notation view from the updated Project. This is the foundational slice every other note-editing ticket builds on.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] App starts from a real empty Project (one empty 4/4 Measure) — the hardcoded `demoProject` in `App.tsx` is gone
- [ ] Each Measure renders as a 4-row × 16-column grid; row 1 (string 1 / G, highest) is on top, row 4 (string 4 / E, lowest) is on the bottom
- [ ] Clicking an empty cell opens an inline numeric input at that cell
- [ ] Typing digits and pressing Enter, or clicking elsewhere, confirms the entry and places a Note there at the default duration (sixteenth note - changed from eighth after real use showed a default wider than one grid cell meant clicking the very next cell silently edited the previous Note instead of creating a new one; see MeasureGrid's disabled-continuation-cell handling)
- [ ] Two-digit fret numbers (e.g. 12) can be entered and confirmed
- [ ] After a Note is placed, the existing AlphaTab view re-renders from the updated Project via `projectToScore`
- [ ] The placement logic is a pure function over `Project`/`Measure` (`placeNoteAt`, per ADR-0004's overwrite model) and is unit-tested the same way `projectToScore.test.ts` already is — independent of the grid UI
