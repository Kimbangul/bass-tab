# 03 — Loading a file resets undo history

**What to build:** Loading a different Save file starts a fresh undo/redo history, so two unrelated documents' histories can never mix.

**Blocked by:** 02 — needs the wired-up history stacks to reset.

**Status:** ready-for-agent

- [ ] After a successful Load, both the undo and redo stacks are empty (Undo/Redo buttons disabled, Ctrl+Z/Ctrl+Shift+Z do nothing)
- [ ] A failed Load (invalid file, parse error) does not clear existing history
