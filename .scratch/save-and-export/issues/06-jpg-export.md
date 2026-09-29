# 06 — JPG export (multiple files, one per page)

**What to build:** An "Export JPG" control reads each system's real position from AlphaTab's `boundsLookup`, groups them into pages with ticket 05's algorithm, captures each page to a canvas, and downloads one JPG file per page.

**Blocked by:** 05 — needs the page-splitting algorithm.

**Status:** ready-for-agent

- [ ] An "Export JPG" (or similarly labeled) control is visible
- [ ] Clicking it reads each rendered system's vertical extent from `boundsLookup` and passes those heights to `splitSystemsIntoPages` (ticket 05) to decide page boundaries
- [ ] Each resulting page is captured to a canvas and downloaded as its own `.jpg` file - never a system cut across two files
- [ ] Filenames distinguish the pages from each other (e.g. numbered) so multiple downloads don't overwrite one another
