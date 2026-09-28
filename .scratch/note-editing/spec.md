# Grid-based note editing

Status: ready-for-agent

## Problem Statement

Someone transcribing a bass line (typically while watching or listening to a reference like a YouTube video) has nowhere to actually put what they hear. The app currently only renders a hardcoded demo Project through AlphaTab (the walking skeleton) — there is no way to create or edit a Note, so nobody can produce a real tab yet.

## Solution

Add an interactive grid to the editor: each Measure renders as 4 rows (one per string) by 16 columns (one per sixteenth-note tick). Clicking a cell places or edits a Note or Rest there, using the overwrite editing model already decided in ADR-0004 — placing something at a position replaces whatever occupied those cells, and nothing outside the edited Measure ever moves. The existing AlphaTab notation view re-renders from the same `Project` after every edit, so the grid is a new interactive layer alongside it, not a replacement for it.

## User Stories

1. As a bass player transcribing a song, I want to click an empty grid cell and type a fret number, so that I can enter a Note at that exact string and time position.
2. As a bass player, I want a new Note to default to a preset duration (sixteenth note - one grid cell) so that I don't have to choose a length before every entry, and so that any cell I click creates an independent Note instead of accidentally editing whichever Note's span happens to reach that far.
3. As a bass player, I want to click a cell that already holds a Note and immediately type a new fret number to overwrite it, so that fixing a mistake doesn't require a separate "edit mode."
4. As a bass player, I want to select a placed Note and change its duration from a toolbar of duration icons, so that I can correct the rhythm without retyping the fret.
5. As a bass player, I want to press the spacebar on a selected/targeted cell to insert a Rest of the current default duration, so that I can mark silence without typing a fret.
6. As a bass player, I want to select a Note and press Backspace/Delete to turn it into a Rest of the same duration, so that removing a note doesn't shift every later note's position.
7. As a bass player, I want to place a Note or Rest longer than the remaining space in the Measure without being blocked, so that validation errors never interrupt my transcribing.
8. As a bass player, I want to click "+ Add measure" to append a new empty Measure to the Project, so that I control when I move past the current measure instead of it happening automatically.
9. As a bass player, I want every Measure's grid to have 16 columns (sixteenth-note resolution), so that any supported Note or Rest duration lines up cleanly on the grid.
10. As a bass player, I want the grid rows ordered the way tab is conventionally read (string 1/G at the top, string 4/E at the bottom), so that the on-screen layout matches printed tab.
11. As a bass player, I want my edits to re-render immediately in the existing AlphaTab notation view, so that I see the real notation output — not just a raw grid — as I transcribe.
12. As a bass player, I want the currently selected cell to be visually distinguishable from the rest, so that I always know what my next keystroke affects.
13. As a bass player entering a two-digit fret (e.g. fret 12), I want to type both digits into an inline input and press Enter to confirm, so that I'm not limited to single-digit frets.
14. As a bass player, I want clicking away from an in-progress inline fret entry to also confirm it, so that I don't lose an entry by clicking elsewhere instead of pressing Enter.
15. As a bass player, I want every Measure to stay at 4/4 in this version, so that I'm not asked to configure something I don't need yet.
16. As a bass player, I don't want an Undo/Redo command in this version, so that I'm not misled into expecting multi-step undo that isn't there — a mistake is fixed by re-clicking the cell.
17. As a bass player, I want the hardcoded demo Project currently in the walking skeleton replaced by a real, editable Project (starting empty, or with whatever I've built), so that the editor stops showing fake data once real editing exists.
18. As a developer, I want the editing operations (place a note, place a rest, delete, change duration, add a measure) implemented as pure functions over the existing Project/Measure/Note/Rest domain model, so that they're unit-testable the same way `projectToScore` already is, independent of the UI.

## Implementation Decisions

- A new pure domain module, alongside the existing `src/domain/project.ts`, exposes the editing operations: `placeNoteAt`, `placeRestAt`, `deleteNoteAt`, `changeDuration`, `addMeasure`. Every one of them takes and returns `Project`/`Measure` values from the existing domain model — no new domain types.
- **Editing model: overwrite, not insert-and-shift** (ADR-0004). Placing a Note or Rest at a tick position replaces whatever it overlaps; nothing outside the edited Measure moves, and no other Measure is ever touched by an edit.
- **Grid resolution**: 16 columns per Measure (sixteenth-note ticks) — the finest `Duration` already modeled, so every supported duration occupies a whole number of columns.
- **Grid row order**: row 1 = string 1 (highest string, top) down to row 4 = string 4 (lowest string, bottom) — matches the domain model's existing string-numbering convention; `projectToScore`'s flip into AlphaTab's own (opposite) convention is unaffected and unchanged.
- **Overflow**: placing a Note/Rest whose duration exceeds a Measure's remaining declared capacity is allowed, not blocked. A Measure's total slot duration is never validated against its time signature (ADR-0004).
- **Click behavior**:
  - Empty cell → an inline numeric input opens at that cell; typing digits and pressing Enter (or clicking elsewhere) confirms and calls `placeNoteAt` with the default duration.
  - Occupied cell (its own start tick) → selects it (shows the duration toolbar) and typing digits overwrites its fret through the same confirm path.
  - A later tick of a Note's own span (e.g. the second tick of an eighth note) is disabled - grayed out, not clickable - rather than redirecting the click back to the Note's start. Real use found the redirect confusing: with the original eighth-note default, clicking the very next cell silently edited the previous Note instead of creating a new one, which read as "my input got erased." A different string at that same tick stays clickable (ADR-0004 overwrite still applies there).
- **Rest entry**: pressing Space on a selected/targeted cell calls `placeRestAt` with the current default duration.
- **Delete**: Backspace/Delete on a selected Note calls `deleteNoteAt`, which replaces it with a Rest of the same duration.
- **Duration change**: selecting a Note shows a small toolbar of duration icons (whole through sixteenth); clicking one calls `changeDuration`.
- **Measure creation**: an explicit "+ Add measure" button calls `addMeasure`, always at 4/4 — no per-measure time-signature UI in this version (ADR-0003).
- **Rendering integration**: after any editing function returns an updated `Project`, the existing `projectToScore` → `AlphaTabApi.renderScore` path (currently wired to a hardcoded `demoProject` in `src/App.tsx`) re-renders it instead.
- No Undo/Redo and no per-measure time-signature UI in this version (both are the ADR-0003 addendum from this same interview, and both are flagged there as likely near-term additions rather than indefinite backlog).

## Testing Decisions

- A good test here asserts only on the returned `Project`/`Measure` values (their `slots`, `timeSignature`, etc.) — never on React component internals, DOM structure, or click-handler wiring.
- Test the new pure editing-functions module only: `placeNoteAt`, `placeRestAt`, `deleteNoteAt`, `changeDuration`, `addMeasure`, each independent of AlphaTab and independent of the grid UI.
- Prior art: `src/rendering/projectToScore.test.ts` sets the pattern to follow — small hand-built `Project`/`Measure` inputs, assertions on the shape of the returned value, one test per new behavior, red before green.
- Explicitly not unit-tested: the grid's click-to-tick coordinate mapping, the inline input's keyboard handling, and the AlphaTab re-render call — these are thin UI wiring around the tested functions.

## Out of Scope

- Per-measure time signature editing UI (ADR-0003) — the data model already supports it, the UI doesn't yet.
- Undo/Redo (ADR-0003).
- Insert-and-shift editing or any reflow across measures (ADR-0004 rejected this model in favor of overwrite).
- Automatic overflow handling (clipping a too-long Note/Rest, auto-creating a new Measure) — overflow is simply allowed, unvalidated.
- Multi-track/multi-instrument editing, file import, audio playback, technique symbols (slides/bends/hammer-ons), a multi-song project library, configurable tuning/string count — all carried over from ADR-0003.
- Saving/loading (IndexedDB auto-save, JSON Save/Load) and PDF/JPG export — named in `CLAUDE.md`'s tech stack but not part of this editing-UX interview; a separate spec.

## Further Notes

- This spec covers only the editing interaction model settled across the `/grilling` session that produced ADR-0004 and the ADR-0003 addendum; it assumes `src/domain/project.ts`'s types and `src/rendering/projectToScore.ts`'s adapter are unchanged.
- The time-signature UI and Undo/Redo cuts were both explicitly flagged as likely near-term follow-ups, not indefinite backlog — worth revisiting soon after this spec ships.
- The user is a JS/TS frontend developer; this spec introduces no new language or runtime.
