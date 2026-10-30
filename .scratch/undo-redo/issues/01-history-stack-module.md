# 01 — Undo/redo history stack module

**What to build:** A pure past/future history stack over generic snapshots (used for `Project` values), independent of React — the foundation ticket 02 wires into the editor.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A new pure module exposes push/undo/redo/clear operations over a generic snapshot type
- [ ] Pushing a snapshot adds it to the past stack and clears the future stack
- [ ] Undo moves the current value from past to future and returns the new current value; a no-op (returns the same current value) when past is empty
- [ ] Redo moves the current value from future to past and returns the new current value; a no-op when future is empty
- [ ] Clear empties both stacks
- [ ] Fully unit-tested, with no dependency on React, `App.tsx`, or the DOM
