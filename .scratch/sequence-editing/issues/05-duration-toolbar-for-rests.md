# 05: Duration toolbar for Rests as well as Notes

**What to build:** The duration toolbar appears whenever a Note or a Rest is selected and highlights its current duration. Clicking a duration sets it directly. This is the mouse counterpart to Space cycling, and it follows the same last-used and undo-grouping rules.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Selecting a Rest shows the toolbar, just as selecting a Note does
- [ ] The toolbar highlights the selected column's current duration and stays in sync while Space cycles it
- [ ] Clicking a duration sets that column's duration (later columns shift in time and are never erased) and makes it the last used duration
- [ ] A toolbar change inside an entry session adds no extra undo step beyond the session's single one
- [ ] Clicking the toolbar does not end the entry (focus and selection are kept)
