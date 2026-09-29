# 04 — PDF export via the browser print dialog

**What to build:** An "Export PDF" control hands the current score to AlphaTab's own print flow; the user finishes the export through their browser's native print dialog (e.g. "Save as PDF"). No page-break computation or PDF assembly is built (ADR-0005).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An "Export PDF" (or similarly labeled) control is visible
- [ ] Clicking it triggers AlphaTab's `print()` on the current score, opening the browser's print-optimized view/dialog
- [ ] No canvas capture, page-break logic, or `jsPDF` usage is added for this ticket (ADR-0005)
