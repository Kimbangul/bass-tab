# 03 — Change a selected Note's duration via a toolbar

**What to build:** Selecting a Note shows a small toolbar of duration icons; picking one changes that Note's duration without touching its fret.

**Blocked by:** 02 — needs the selection state introduced there.

**Status:** ready-for-agent

- [ ] Selecting a Note shows a toolbar of duration icons (whole, half, quarter, eighth, sixteenth)
- [ ] Clicking a duration icon changes the selected Note's duration and nothing else about it
- [ ] The grid and the AlphaTab view both re-render reflecting the new duration
- [ ] The duration-change logic is a pure function over `Project`/`Measure` (`changeDuration`), unit-tested independently of the UI
