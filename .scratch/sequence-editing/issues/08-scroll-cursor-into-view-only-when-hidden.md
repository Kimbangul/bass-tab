# 08: Scroll only to reveal a hidden cursor

**What to build:** When keyboard navigation (ticket 06) moves the cursor to a cell outside the viewport, for example into the next Measure further down, scroll just enough to show it. If the cursor is already visible, nothing scrolls.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] When the cursor's cell is fully visible after an input, the page does not scroll
- [ ] When the cursor's cell is partly or fully off-screen after an input, the page scrolls by the minimum amount (`nearest`) to show it
- [ ] The sticky toolbar from ticket 07, if landed, never covers the revealed cell (account for its height, e.g. with scroll margin)
- [ ] Clicking a cell never causes a scroll (it is already visible)
