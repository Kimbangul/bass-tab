---
status: accepted
---

# Overwrite-based note editing, not insert-and-shift

The editor needs to let a user place or fix a note at any position in a measure, not just append at the end. Two implementation models do that: **overwrite** (Guitar Pro / piano-roll style — a measure's grid capacity is fixed by its time signature, and placing a note at a position overwrites whatever occupied those cells; nothing outside the measure ever moves) versus **insert-and-shift** (word-processor style — placing a note pushes every later note forward in time, potentially cascading into new measures). Insert-and-shift means every edit can ripple through the rest of the Project; overwrite keeps every edit local to one measure.

**Decision**: Bass Tab Editor uses the overwrite model.

- Clicking a grid cell places or edits the note there; an existing note it overlaps is replaced.
- A note whose duration overflows the measure's declared capacity is entered anyway, not blocked — no validation that a measure's total duration matches its time signature.
- Deleting a note turns it into a rest of the same duration; it is never removed in a way that shifts later notes.
- Measures are never created automatically; the user adds them explicitly (see ADR-0003 for the time-signature-UI and Undo/Redo cuts this same interview made).

**Consequences**: Editing is always a single-measure operation — no project-wide reflow to reason about or test. The unvalidated overflow means a measure can visually run longer than its time signature suggests; if that proves confusing in practice, add validation later without touching the overwrite model itself.
