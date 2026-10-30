# 02 — Wire undo/redo into every editing action

**What to build:** Every confirmed action that changes the Project becomes undoable/redoable, via keyboard shortcuts and visible buttons.

**Blocked by:** 01 — needs the history stack module.

**Status:** ready-for-agent

- [ ] Every `App.tsx` handler that mutates `Project` (place a Note, place a Rest, change a duration, delete a Note, add a measure, change the title) pushes the pre-change Project onto the history module before applying the change
- [ ] Ctrl+Z undoes the most recent such action; Ctrl+Shift+Z redoes it
- [ ] The keyboard listener is ignored while a `MeasureGrid` fret-entry input has focus, so it never fights that input's own Backspace/Delete handling or the browser's native text-field undo
- [ ] Undo and Redo buttons are visible next to the existing action buttons (Add measure / Export / Save / Load), each disabled when their respective stack is empty
- [ ] Export and Save actions do not push onto the history (they don't mutate `Project`)
