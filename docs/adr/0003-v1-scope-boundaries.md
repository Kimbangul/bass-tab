---
status: accepted
---

# v1 scope boundaries

The interview considered, and deliberately excluded from v1, several features a full tab editor like Guitar Pro normally has: extra instrument tracks alongside bass, importing existing Guitar Pro/MusicXML/MIDI files, audio playback, tab technique symbols (slides, bends, hammer-ons), a multi-song project library, and configurable tuning/string count. Each was cut to keep v1 buildable, not omitted by oversight.

**Decision**: v1 supports exactly one Project open at a time, a single standard-tuned 4-string bass track, manual note entry only (no file import), no audio playback, and no technique symbols beyond plain fret numbers and durations.

The editing-UX interview (see ADR-0004) surfaced two more deliberate v1 cuts of the same kind: a UI for changing a measure's time signature (every measure is 4/4 until there's a UI for it, though `Measure.timeSignature` already supports otherwise), and Undo/Redo (mistakes are fixed by overwriting the cell again). Both are flagged as likely near-term additions, not backlog-and-forget — unlike the rest of this list, expect these to come up again soon.

**Consequences**: A reader expecting Guitar-Pro-equivalent features should read their absence as deliberate MVP scoping, not a bug. Each one is its own future decision once v1 proves out the core editing/export loop.
