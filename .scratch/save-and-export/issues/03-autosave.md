# 03 — Auto-save to IndexedDB and silent restore

**What to build:** The current Project is saved to the browser's IndexedDB automatically as it changes, with no user action, and restored automatically the next time the app loads - no confirmation prompt, since there's nothing yet to choose between.

**Blocked by:** 02 — reuses `parseSavedProject` for validating what comes back out of storage.

**Status:** ready-for-agent

- [ ] Every change to the Project is persisted to IndexedDB, debounced so rapid edits don't write on every keystroke
- [ ] On app load, if a previously auto-saved Project exists, it's restored silently (no confirmation) instead of starting from the empty default
- [ ] The stored and restored data uses the same Project shape as explicit Save/Load, validated through `parseSavedProject`
- [ ] A corrupted or unreadable auto-save doesn't crash the app on load - it falls back to the empty default Project
