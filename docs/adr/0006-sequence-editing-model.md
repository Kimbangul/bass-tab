---
status: accepted
supersedes: 0004
---

# Sequence-based note editing, not a fixed time grid

ADR-0004 made each Measure a fixed-capacity time grid (16 sixteenth-note columns for 4/4): placing a Note overwrote whatever it overlapped, a Note wider than one column disabled the columns it spanned, and the gaps were backfilled with Rests. In real use this put the rhythm's arithmetic in the way of entering notes. The user wants to type Notes one after another without the grid caring whether a Measure's durations add up to its time signature.

**Decision**: A Measure is an ordered sequence of Notes and Rests. Its time signature is a label, not a capacity.

- One Note or Rest takes one column, whatever its duration. No column is ever disabled because of a neighbor's duration.
- A Measure may hold more or fewer beats than its time signature implies. This is never blocked, and the editor shows no over/under indicator.
- Editing works on positions in the sequence: replace one (a replaced slot keeps its duration), insert before one, or remove one (later slots move up). Changing a slot's duration moves the later slots in that Measure in time but never touches another Measure.
- Nothing overwrites a neighbor and nothing is backfilled. A new Measure starts as an empty sequence.
- Measures are still never created automatically. This carries over from ADR-0004.

**Considered and rejected**: keeping the overwrite grid and only simplifying Rest entry. The trouble was the grid itself (disabled columns, overwrites, capacity), not Rest entry alone.

**Consequences**: Saved Projects need no migration, because `Measure.slots` was already an ordered list and old data reads as a sequence that happens to contain backfilled Rests. Grid width no longer comes from the time signature, so the tick math added for the time-signature UI goes away. AlphaTab now receives Measures that overflow, underflow or are empty, and the adapter has to render those without failing.
