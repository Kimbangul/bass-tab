---
status: accepted
---

# PDF export via the browser's print dialog, not programmatic canvas+jsPDF assembly

The original plan (recorded in `CLAUDE.md` before any of this was built) was to render AlphaTab's page layout to a canvas per page and assemble the pages with `jsPDF`. Investigating AlphaTab's actual layout API found that assumption wrong: `LayoutMode.Page` is a vertically endless single scroll, not a stack of fixed-size pages — there's no `pageWidth`/`pageHeight` setting and no built-in page-break concept. Producing genuine A4 pages ourselves would mean manually deciding break points (naively by pixel height, risking a cut mid-system, or system-boundary-aware via AlphaTab's `boundsLookup`) and assembling the result into a PDF by hand.

**Decision**: Bass Tab Editor exports to PDF by calling AlphaTab's own `api.print()`, which opens a print-optimized popup; the user finishes the export through their browser's native print dialog (e.g. "Save as PDF"). No canvas capture, page-break computation, or `jsPDF` assembly is written for PDF export.

**Consequences**: PDF export is a couple of lines instead of a rendering pipeline, and pagination correctness is the browser's problem, not ours. The trade-off is one extra manual step for the user (the print dialog) instead of a one-click file download. `jsPDF` was expected to remain a dependency because JPG export still needs canvas capture (see the note-editing spec's JPG page-splitting decision, which does use `boundsLookup` for system-boundary-aware breaks — the same technique considered and rejected here for PDF, since the print dialog makes it unnecessary there); JPG export shipped using `canvas.toBlob('image/jpeg')` directly instead, so `jsPDF` ended up unused and should be removed from `package.json`. If one-click PDF download is wanted later, revisit this ADR rather than silently building it alongside `api.print()`.
