# 01 — Editable song title

**What to build:** The static "Bass Tab Editor" heading becomes a text input bound to the Project's title. Typing updates the title immediately, and the AlphaTab notation view (which already renders `Project.title`) reflects the change right away.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The heading area is an editable text input, not static text
- [ ] Typing into it updates the current Project's title
- [ ] The AlphaTab-rendered score's title updates to match (already wired via `projectToScore`, since `Project.title` already feeds `Score.title`)
- [ ] The Project still starts as "Untitled" by default
