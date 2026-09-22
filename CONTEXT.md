# Bass Tab Editor

A browser-based, client-only editor for hand-entering 4-string bass guitar tablature with full rhythmic notation, then exporting it as a printable score. It replaces an earlier idea of automatically extracting tab from YouTube videos or photos — see [ADR-0001](./docs/adr/0001-manual-entry-not-automated-extraction.md).

## Language

### Editing model

**Project**:
The single bass tab document a user is working on: a title, a fixed 4-string tuning, and an ordered list of Measures. Only one Project is open at a time in v1.
_Avoid_: Song, File, Document, Score

**Measure**:
A segment of a Project holding a fixed number of beats set by the time signature; Notes are placed within a Measure and rhythmically aligned to it.
_Avoid_: Bar

**Note**:
A single played pitch within a Measure: a string, a fret number, and a duration. An unfilled position in a Measure is a rest, not a Note.
_Avoid_: Beat, Event

**Tuning**:
The fixed mapping of the bass's four strings to pitches (standard E-A-D-G in v1). Not user-configurable yet.

### Persistence & output

**Save**:
Writing the current Project's editable state to a portable file, and the matching Load that reads it back in. Distinct from Auto-save and from Export — a Save can be reopened and edited again.
_Avoid_: Export, Backup

**Auto-save**:
The editor's own continuous, silent preservation of the current Project's state in the browser, with no user action required. Distinct from a user-triggered Save.
_Avoid_: Save

**Export**:
A rendered, non-editable PDF or JPG produced from a Project for viewing or printing. Cannot be loaded back in as a Project.
_Avoid_: Save, Print
