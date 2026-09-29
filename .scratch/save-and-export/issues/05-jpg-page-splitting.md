# 05 — Page-splitting algorithm for JPG export

**What to build:** A pure function that decides where JPG page breaks fall, given the vertical extents of each rendered system (line of music) and a target page height - grouping whole systems into pages without ever cutting through one.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A function (e.g. `splitSystemsIntoPages(systemHeights, maxPageHeight)`) takes the height of each system in order and a maximum page height, and returns systems grouped into pages
- [ ] No page's systems sum to more than `maxPageHeight` unless a single system alone already exceeds it (that system gets its own page rather than being dropped or corrupted)
- [ ] Systems keep their original order across the returned pages
- [ ] This function has no dependency on AlphaTab, canvas, or the DOM - it's tested directly with plain height numbers, the same way `placeNoteAt` is tested with plain Measure values
