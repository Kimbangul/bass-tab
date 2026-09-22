---
status: accepted
---

# AlphaTab as the rendering engine, decoupled from Project storage

v1 requires fully rhythm-notated tab (measures, note durations, beam grouping) for 4-string bass, not a simplified fret-number list — hand-rolling a music engraving renderer from scratch is a substantial project on its own. AlphaTab (`@coderline/alphatab`) is a TypeScript-native library purpose-built for guitar/bass tab and standard-notation rendering, including page-based layout suitable for A4 export, so it was chosen over writing a custom renderer or using a lower-level library like VexFlow.

**Decision**: AlphaTab is used purely as the read-only rendering layer. The editor keeps its own Project data model (Measures/Notes) as the source of truth and converts it to AlphaTab's Score representation only to render; AlphaTab is never the source of truth, and its import/playback features are not used in v1.

**Consequences**: Rendering is tied to AlphaTab's API and page-layout capabilities — swapping renderers later means writing a new Project→renderer adapter. Save and Auto-save files are unaffected by that swap since they store the Project model, not AlphaTab's Score.
