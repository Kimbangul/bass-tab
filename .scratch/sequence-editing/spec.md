# Sequence-based note editing

Status: ready-for-agent

## Problem Statement

A bass player transcribing a song wants to type Notes one after another. The current grid (ADR-0004) is a fixed 16-column time grid per Measure, and it keeps making them think about rhythm arithmetic:
- A Note longer than a sixteenth disables the columns it spans.
- Making a Note or Rest longer silently overwrites the Notes after it.
- Rests are invisible.
- Entering a Rest closes the selection, so its length can't be adjusted.
- A Rest always gets one fixed default length.

They want to enter Notes freely, as many as they like, whether or not a Measure's durations add up to its time signature. They also want to set a Note's or Rest's length by pressing the same key again while it is still selected.

## Solution

Each Measure becomes an ordered sequence of Notes and Rests (ADR-0006, superseding ADR-0004). The grid shows one column per Note or Rest, whatever its duration:
- A duration label sits above each column.
- A Note shows its fret on its string's row.
- A Rest shows one mark spanning all four rows.
- An append column (+) always sits at the end of a Measure.

Entering works from the keyboard:
- Digits + Enter put a Note at the cursor and move to the next column.
- Space cycles the selected column's duration. In an empty entry, Space creates a Rest. While a fret is being typed, Space confirms the Note and keeps it selected so the next Space cycles it.
- Shift+Space cycles the other way.
- Backspace/Delete removes a column.
- `I`/Insert opens a new column before the cursor.
- New columns use the most recently used duration.

Nothing is blocked and nothing is flagged when a Measure is longer or shorter than its time signature.

## User Stories

1. As a bass player, I want each Note or Rest to take exactly one grid column whatever its duration, so that a long Note never makes nearby columns unusable.
2. As a bass player, I want to keep entering Notes past what the time signature holds, so that I'm never stopped mid-transcription by rhythm arithmetic.
3. As a bass player, I want no warning or indicator when a Measure is longer or shorter than its time signature, so that the editor stays out of my way.
4. As a bass player, I want an append column (+) at the end of every Measure, so that I always know where the next Note goes.
5. As a bass player, I want to select a column on a string, type a fret, and press Enter to place a Note there, so that entering a Note is quick.
6. As a bass player, I want the cursor to move to the next column after I press Enter, so that I can type a run of Notes without clicking each column.
7. As a bass player, I want the cursor to stay on the Measure's append column when I reach the end of a Measure, so that a new Measure is never created behind my back.
8. As a bass player, I want typing a fret on an existing column to replace that Note or Rest with a Note while keeping its duration, so that fixing a wrong fret or string doesn't undo my rhythm.
9. As a bass player, I want a new Note or Rest to default to the duration I used most recently, so that a run of eighth notes needs its duration set only once.
10. As a bass player, I want to type a fret and press Space to confirm the Note while keeping it selected, so that I can set its length right away.
11. As a bass player, I want each further Space on a selected Note or Rest to make it one step longer (1/16 → 1/8 → 1/4 → 1/2 → 1/1 → back to 1/16), so that I can reach any length with one key.
12. As a bass player, I want Shift+Space to step the length the other way, so that I can go back without cycling all the way around.
13. As a bass player, I want Space in an empty entry, or on the append column, to create a Rest that stays selected, so that I can enter a Rest and set its length with the same key.
14. As a bass player, I want selecting an existing Note or Rest and pressing Space to cycle its length, so that I can fix rhythm later with the same gesture.
15. As a bass player, I want a longer Note or Rest to push later columns in the Measure later in time rather than erase them, so that changing a length never loses my input.
16. As a bass player, I want Backspace/Delete on a selected column (with an empty fret entry) to remove it and close the gap, so that deleting works like deleting in a list.
17. As a bass player, I want `I` (or Insert) to open a new column before the cursor, so that I can add a Note I missed in the middle of a Measure.
18. As a bass player, I want Rests to be visible in the grid, so that I can see and select them like Notes.
19. As a bass player, I want each column to show its duration label, so that I can read the rhythm from the grid when column widths no longer show it.
20. As a bass player, I want the duration toolbar to appear for a selected Rest as well as a Note, with the current duration highlighted, so that I can jump straight to a length with the mouse and always see the current one.
21. As a bass player, I want one Ctrl+Z to undo a whole entry, including all the Space presses on that same column, so that undo matches "what I did" rather than each keypress.
22. As a bass player, I want a new Measure to start empty (just the append column), so that I'm not handed a whole Rest I have to clear first.
23. As a bass player, I want Projects I saved under the old grid to open and keep working, so that switching models doesn't cost me my work.
24. As a bass player, I want the AlphaTab notation to keep rendering for Measures that are empty, short, or overfull, so that the score preview never breaks while I'm mid-entry.
25. As a developer, I want the whole keyboard entry flow implemented as a pure reducer, so that behaviors like "`5 Space Space Enter` gives a 1/4 Note at fret 5 and moves the cursor" are unit-testable without the DOM.

## Implementation Decisions

- **Model (ADR-0006)**: `Measure.slots` stays an ordered `Note | Rest` list, with no type changes. What changes is how it's read: the time signature is only a label, slot positions are list indices (not ticks), and no operation ever backfills Rests.
- **Domain editing functions** are rewritten to work on positions. Tick, overwrite and backfill logic is deleted. They are pure functions over `Measure`, in the existing editing module:
  - **replace at index**: a Note keeps the replaced slot's duration.
  - **insert at index**
  - **remove at index**: later slots move up.
  - **set duration at index**: works on Notes and Rests alike.
  - **next/previous duration**: the cycle order is `sixteenth → eighth → quarter → half → whole → sixteenth` and wraps around.
  - **add measure**: creates an empty slot list in the chosen time signature.
- **Removed**: `ticksPerMeasure`, the tick-range helpers, `DEFAULT_NOTE_DURATION` and `DEFAULT_REST_DURATION`, which are replaced by "last used duration". The disabled continuation cells in the grid also go. The time-signature picker on Add measure stays; it only sets the label.
- **New module, the keyboard entry reducer**: a pure `(EntryState, EntryInput) → EntryResult` in `src/domain/`.
  - `EntryState` holds:
    - the cursor: Measure index, column index (the append column is index `slots.length`), and string
    - the fret digits typed so far
    - the last used duration
    - whether the current entry session has already recorded an undo snapshot
  - `EntryInput` covers digits, Enter, Space, Shift+Space, Backspace/Delete, Insert/`I`, select-cell (mouse), and blur.
  - `EntryResult` returns the next `EntryState`, the next `Project`, and whether the caller should push the pre-change `Project` onto undo history.
  - Rules:
    - **Digits + Enter**: replace or append a Note, then move the cursor to the next column in the same Measure. It never crosses into another Measure.
    - **Space with digits pending**: confirm the Note and keep it selected.
    - **Space with an empty entry on the append column**: append a Rest with the last used duration.
    - **Space with an empty entry on an existing column**: cycle that column's duration forward.
    - **Shift+Space**: cycle backward.
    - Every duration chosen, whether by cycling or the toolbar, becomes the last used duration.
    - **Backspace/Delete with an empty entry**: remove the column. With digits pending, it edits the digits.
    - **`I`/Insert**: open a pending new column before the cursor. Confirming it inserts the slot; abandoning it with blur or an empty confirm inserts nothing.
    - **Blur or select-cell with digits pending**: confirm the Note (as Enter does today), without moving the cursor.
  - **Undo grouping**: an entry session runs from selecting or arriving at a column until the cursor leaves it. Only the session's first change asks for an undo snapshot; the rest of the session (more Space cycles, toolbar clicks) adds none. The generic history module is unchanged.
- **UI wiring**: `MeasureGrid` renders from `Measure.slots` and the reducer's cursor and turns DOM events into `EntryInput`s. `App` holds `EntryState`, applies each `EntryResult`, and calls the existing history `push` when told to.
  - Each column shows a duration label.
  - A Note shows its fret on its own string's row.
  - A Rest shows one mark across all four rows.
  - The duration toolbar shows for any selected Note or Rest and highlights its duration.
- **Rendering adapter**: `projectToScore` must turn an empty Measure (zero slots) into a renderable AlphaTab bar. The likely fix is a single empty beat, which is invisible and adapter-only; it never enters the `Project`. Measures that overflow or underflow their time signature are passed through as-is.
- **Persistence**: no change and no migration. Old saves read as sequences that contain their former backfilled Rests.

## Testing Decisions

- A good test asserts only on returned values: the `Measure`/`Project` slots, the reducer's `EntryState`, and its "push history?" flag. It never asserts on React, the DOM, or AlphaTab internals beyond the Score shape.
- **Keyboard entry reducer** (new, test-first): the primary seam. Each test feeds a key sequence and checks the result. Examples:
  - `5 Space Space Enter` gives a 1/4 fret-5 Note and puts the cursor on the next column.
  - `Space Space` on the append column gives a selected Rest one step longer than the last used duration.
  - Shift+Space wraps 1/16 back to 1/1.
  - Replacing a column keeps its duration.
  - Delete removes a column and closes the gap.
  - `I` followed by a blur with nothing typed inserts nothing.
  - Enter at the append column doesn't create a Measure.
  - A session with a Rest and three cycles asks for exactly one history push.
- **Domain editing functions** (rewritten, test-first): replace, insert, remove, set duration, the duration cycle (including wraparound), and add measure (empty). The overwrite/backfill tests in the existing editing test file are deleted with the behavior they covered.
- **Rendering adapter**: add cases for an empty Measure and an overfull Measure, following `projectToScore.test.ts`.
- **Prior art**: `projectToScore.test.ts` and the editing and history test files. Inputs are small hand-built `Project`/`Measure` values, with one behavior per test, written red before green.
- **Not unit-tested**: DOM event → `EntryInput` mapping, focus handling, column rendering, and the toolbar's mouse handling. These are thin wiring around the reducer.

## Out of Scope

- Moving the cursor between Measures with the keyboard (arrow keys, Enter at the end of a Measure crossing over). The user clicks into the next Measure.
- Any over/under-capacity indicator, auto-split, or auto-tie across Measures.
- A shortcut for turning an existing Note into a Rest in place. The way to do it is Delete, then `I`, then Space.
- Moving Notes between Measures and cross-Measure reflow. Edits stay within one Measure.
- Chords or more than one Note per column. The model stays monophonic.
- Everything already out of scope in ADR-0003, apart from what later specs have taken on (Undo/Redo, the time-signature UI).

## Further Notes

- Supersedes the editing parts of `.scratch/note-editing` (overwrite, disabled continuation cells, default durations).
- `ticksPerMeasure` and grid-width-from-time-signature from `.scratch/time-signature-ui` ticket 01 are removed. Its ticket 02 (the picker) still applies.
- `CONTEXT.md` has already been updated: Measure is now a sequence, Note no longer mentions rests, and Rest has been added.
- Risk to check early: how AlphaTab renders a bar whose beats don't add up to its time signature, and a bar with a single empty beat.
