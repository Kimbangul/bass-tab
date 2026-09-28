# Bass Tab Editor

A browser-only editor for hand-entering rhythm-notated 4-string bass tab and exporting it as an A4 PDF/JPG score — not a tool that extracts tab from video, photos, or audio (that path was tried and rejected, see ADR-0001).

## Domain vocabulary

Read `CONTEXT.md` before naming a Project, Measure, Note, Save, Auto-save, or Export in code or conversation — it picks one canonical term per concept and lists the ones to avoid.

## Architecture decisions (`docs/adr/`)

- **Extraction vs. manual entry, no backend** — before adding any video/audio/image processing or a server: [0001](docs/adr/0001-manual-entry-not-automated-extraction.md)
- **Rendering engine** — before picking or swapping the notation-rendering library: [0002](docs/adr/0002-alphatab-rendering-engine.md)
- **v1 scope** — before adding multi-track, file import, playback, technique symbols, a time-signature UI, or Undo/Redo: [0003](docs/adr/0003-v1-scope-boundaries.md)
- **Note editing model** — before touching how placing/deleting a note works: [0004](docs/adr/0004-overwrite-note-editing.md)
- **PDF export mechanism** — before building any canvas/page-break/jsPDF pipeline for PDF: [0005](docs/adr/0005-print-based-pdf-export.md)

## Tech stack

Client-only TS web app (Vite + React). Rendering engine and no-backend call are in ADR-0001/0002 above; not restated here.

- PDF export: `api.print()`'s browser print dialog, not a canvas/jsPDF pipeline (ADR-0005)
- JPG export: multiple files, one per page - page breaks found via AlphaTab's `boundsLookup` (system-boundary-aware, never mid-system), each page captured to canvas and exported with `canvas.toBlob('image/jpeg')`
- Persistence: both an IndexedDB auto-save and an explicit JSON Save/Load, same Project shape for both
- `npm test` runs the vitest suite; `src/domain/` (Project model) and `src/rendering/` (Project→AlphaTab Score adapter) are built test-first — see their `*.test.ts` files for the seam's behavior before changing either

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `<type>: <imperative summary>`, e.g. `feat: add duration toolbar for selected notes`. A body is welcome for anything non-obvious (what a code-review pass caught and fixed, why an approach was rejected) but the subject line always carries the type.

- **feat** — new user-facing behavior (a ticket's acceptance criteria going green)
- **fix** — correcting behavior that was wrong, including a code-review finding fixed before the feat commit ever lands
- **refactor** — internal restructuring with no behavior change
- **test** — test-only changes (new coverage, no production code touched)
- **docs** — `CONTEXT.md`, ADRs, specs/tickets, this file
- **chore** — tooling, dependencies, config; nothing under `src/`

One commit, one type — if a change is both a fix and a refactor, pick whichever the reader most needs to know before touching that code.

## Implementation gating

Don't write implementation code during a design/discussion turn — a `/grilling` session, a bug report, a spec question — even once the cause and the fix are agreed on. This applies to bug fixes as much as new features. Land on a decision, update the relevant doc (spec, ticket, ADR, or this file), and stop there; implementation is its own, separately-requested step, triggered only by the user explicitly asking for it (e.g. "구현해줘", "implement this", invoking `/implement`).

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
