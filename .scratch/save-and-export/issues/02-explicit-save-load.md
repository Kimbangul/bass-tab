# 02 — Explicit Save (JSON download) and Load (JSON upload)

**What to build:** A "Save" control downloads the current Project as a JSON file named after its title; a "Load" control opens a file picker, parses the chosen file back into a Project, and replaces the current work after confirming the user wants to discard what's open.

**Blocked by:** 01 — a meaningful filename needs an editable title.

**Status:** ready-for-agent

- [ ] `parseSavedProject(json: string)` is a pure function that turns a valid JSON string back into a `Project`, and signals failure (throws, or returns null - implementer's call, documented) for malformed or wrong-shaped input
- [ ] A "Save" control downloads the current Project as a `.json` file, named from its title
- [ ] A "Load" control opens a file picker; choosing a valid file replaces the current Project with the parsed one
- [ ] Loading a file first shows a confirmation prompt (the current work will be replaced) before applying it
- [ ] Choosing an invalid/malformed file does not silently corrupt the current Project - the user sees that the load failed
- [ ] `parseSavedProject` is unit-tested independently of the file-picker/download UI, the same way `projectToScore` is tested
