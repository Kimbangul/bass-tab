---
status: accepted
---

# v1 scope boundaries

The interview considered, and deliberately excluded from v1, several features a full tab editor like Guitar Pro normally has: extra instrument tracks alongside bass, importing existing Guitar Pro/MusicXML/MIDI files, audio playback, tab technique symbols (slides, bends, hammer-ons), a multi-song project library, and configurable tuning/string count. Each was cut to keep v1 buildable, not omitted by oversight.

**Decision**: v1 supports exactly one Project open at a time, a single standard-tuned 4-string bass track, manual note entry only (no file import), no audio playback, and no technique symbols beyond plain fret numbers and durations.

**Consequences**: A reader expecting Guitar-Pro-equivalent features should read their absence as deliberate MVP scoping, not a bug. Each one is its own future decision once v1 proves out the core editing/export loop.
