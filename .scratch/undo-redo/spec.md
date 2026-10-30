# Undo/Redo

Status: ready-for-agent

## Problem Statement

ADR-0004's overwrite editing model has no safety net: a wrong click permanently replaces a Note, recoverable only by remembering and retyping it. ADR-0003's addendum flagged Undo/Redo as a likely near-term addition once the core editing/export loop shipped, which it now has.

## Solution

Every confirmed, state-changing action against the current `Project` (placing a Note/Rest, changing a duration, deleting a Note, adding a measure, editing the title) pushes the Project's prior value onto an in-memory undo stack. Ctrl+Z and an Undo button pop it back; Ctrl+Shift+Z and a Redo button step forward again. The history is a plain linear stack of `Project` snapshots — it doesn't know about individual editing operations. Loading a different Save file clears both stacks; a page refresh also starts empty, even though auto-save still restores the last `Project` itself.

## User Stories

1. As a user, I want to press Ctrl+Z after any confirmed edit to revert it, so mistakes are cheap to fix.
2. As a user, I want Ctrl+Shift+Z (or a Redo button) to reapply an action I just undid, so I can recover from undoing too far.
3. As a user, I want visible Undo/Redo buttons, so I can discover the feature without knowing the shortcut.
4. As a user, I want the Undo/Redo buttons disabled when there's nothing in that direction, so I always know whether more history exists.
5. As a user, I want loading a different Save file to start a fresh undo history, so undoing after a Load can never mix two unrelated documents.
6. As a user, I don't expect my undo history to survive a page refresh, so the editor makes no promise it doesn't keep.
7. As a user typing into a fret-entry cell, I want Ctrl+Z to leave my in-progress typing alone rather than firing a global undo, so I don't lose what I'm mid-way through entering.
8. As a developer, I want undo/redo implemented as a generic history stack over `Project` snapshots, so it doesn't need to know about `placeNoteAt`/`addMeasure`/etc. individually and stays correct as new action types are added.

## Implementation Decisions

- **History model**: two stacks (past, future) of `Project` values, held as new state in `App.tsx` alongside `project`. Undo: pop past → push current `project` onto future → `setProject` to the popped value. Redo is the mirror. Any new edit after an undo clears the future stack (standard undo/redo semantics).
- **Undoable action boundary**: every place `App.tsx` already calls `setProject` from a handler that mutates `measures` or `title` — `handlePlaceNote`, `handlePlaceRest`, `handleChangeDuration`, `handleDeleteNote`, `handleAddMeasure` (including the time-signature-ui spec's signature argument), `handleChangeTitle`. Each pushes the *pre-change* Project onto the past stack before applying the change.
- **Not undoable actions**: `handleExportPdf`, `handleExportJpg`, `handleSave` (none mutate `Project`).
- **Load resets history**: `handleLoadFile` clears both stacks (as part of, or immediately after, its `setProject` call on a successful parse) rather than pushing the old Project onto the past stack — a Load is a new document, not an edit to undo back out of.
- **Persistence**: both stacks are in-memory component state only — never written to IndexedDB auto-save, never part of the Save/Load JSON shape. A page refresh (even one that restores the last auto-saved Project) starts with empty stacks.
- **No depth cap** in v1 — a plain growing array; revisit only if this proves to be a real memory/perf problem in practice.
- **Keyboard shortcuts**: a single `keydown` listener (document/window level) for Ctrl+Z (undo) and Ctrl+Shift+Z (redo), ignored while a `MeasureGrid` fret-entry `<input>` has focus — so it never fights that input's own Backspace/Delete handling or a browser's native text-field undo.
- **UI placement**: two buttons ("Undo"/"Redo") next to the existing "+ Add measure" / Export / Save / Load row, each `disabled` when its stack is empty.

## Testing Decisions

- The history stack's push/pop/undo/redo/clear semantics should be a pure module (e.g. `src/domain/history.ts`), independent of React — unit-tested the same style as `editing.ts` and `pageSplitting.ts`: given a sequence of pushes and undo/redo calls, assert the resulting past/future/current state.
- Not unit tested: the `App.tsx` wiring that calls into the history module from each handler, the keyboard listener, and the button rendering/disabled-state — thin UI wiring, same category as `MeasureGrid`'s existing untested DOM handling.

## Out of Scope

- Persisting undo history across page reloads.
- Granular/per-keystroke undo inside the fret-entry input — only confirmed actions are undoable, matching `CONTEXT.md`'s existing action boundaries (Note/Rest placement, not each digit typed).
- Undo for Export/Save (they don't mutate `Project`).
- A depth cap or history pruning strategy.

## Further Notes

- Closes the second of the two "likely near-term" items ADR-0003's addendum named (the other, per-measure time signature UI, is spec'd separately in `.scratch/time-signature-ui/`).
- The chosen model — full-`Project`-snapshot stack, in-memory only, cleared on Load — is a real architectural trade-off (snapshots vs. recording individual commands; session-only vs. persisted) that a future reader might not expect. Worth an ADR once this ships; ask before starting implementation if you'd like one recorded.
