# Technique symbols

Status: ready-for-agent

## Problem Statement

A bass tab isn't just frets and durations — real playing uses slides, bends, hammer-ons/pull-offs, vibrato, palm muting, and ghost notes, and right now there's no way to notate any of them. ADR-0003 cut "technique symbols beyond plain fret numbers and durations" from v1 scope, naming slides/bends/hammer-ons as the representative example; this spec lifts that cut.

## Solution

Six technique symbols become available on a selected Note, applied through small controls grouped into three sections (Slide / Bend / 기타) next to the existing duration toolbar: Slide (independent in/out), Bend (one of seven types plus a semitone amount), Hammer-on/Pull-off, Vibrato, Palm mute, and Ghost note. All six are independent of each other and of duration — any combination can apply to the same Note, matching how AlphaTab's own Note model already treats them as unrelated fields. `projectToScore`'s existing adapter (ADR-0002) is extended to map each onto AlphaTab's corresponding Note properties; nothing about the Project format's existing fields changes.

## User Stories

1. As a user, I want to mark a selected Note as sliding in from below or from above, so that I can notate a slide into a note.
2. As a user, I want to mark a selected Note as sliding out via a shift, a legato slide, an upward slide-out, or a downward slide-out, so that I can notate every common way a slide leaves a note.
3. As a user, I want a slide-out with a destination (shift/legato) to visually connect to the next Note on the same string, so that the notation reads the way real tab does.
4. As a user, I want to apply a slide-out even when there's no next Note on the same string to connect to, without being blocked, so that validation never interrupts my transcribing (ADR-0004's existing permissiveness).
5. As a user, I want to choose one of the seven bend types (simple bend, release, bend-release, hold, prebend, prebend-bend, prebend-release) on a selected Note, so that I can notate the specific bend shape I hear.
6. As a user, I want to specify how many semitones a bend rises (and, for two-phase types, how many it releases to), so that the bend's pitch is accurate, not just its shape.
7. As a user, I want to mark a selected Note as a hammer-on/pull-off origin, so that it connects to the next Note on the same string without a second pick attack.
8. As a user, I want the hammer-on vs. pull-off distinction to be inferred automatically from whether the next Note's fret is higher or lower, so that I don't have to specify a direction myself.
9. As a user, I want to apply vibrato (slight or wide) to a selected Note, so that I can notate a shaky/wavering pitch.
10. As a user, I want to mark one or more consecutive Notes as palm-muted independently, each with its own toggle, so that marking a run of muted notes doesn't require picking a separate "end" note.
11. As a user, I want a run of consecutively palm-muted Notes to render as one connected muted passage (not as disconnected individual marks), so the notation looks like real palm-muting.
12. As a user, I want to mark a selected Note as a ghost note, so that it's shown in parentheses and played more quietly.
13. As a user, I want to apply more than one technique to the same Note (e.g. a bend with vibrato), so that I can notate real playing, which often combines techniques.
14. As a user, I want all six technique controls grouped into three visually distinct sections (Slide / Bend / 기타) rather than one long row, so that the toolbar stays readable with this many controls.
15. As a developer, I want every technique mapped in the existing `projectToScore` adapter (not a new seam), so that the Project-is-source-of-truth boundary (ADR-0002) stays in exactly one place.
16. As a developer, I want a bend's semitone amount to convert to AlphaTab's quarter-tone `BendPoint` units internally, so that the UI stays in musician-friendly semitones without the adapter losing precision.

## Implementation Decisions

- **Domain model** (`src/domain/project.ts`): `Note` gains six independent optional fields, undefined meaning "not applied" (no new "None" enum members, matching the existing flat-interface style):
  - `slideIn?: "fromBelow" | "fromAbove"`
  - `slideOut?: "shift" | "legato" | "outUp" | "outDown"`
  - `bend?: { kind: "bend" | "release" | "bendRelease" | "hold" | "prebend" | "prebendBend" | "prebendRelease"; semitones: number; releaseSemitones?: number }` — bundled into one sub-object (kind/semitones/releaseSemitones always travel together); `releaseSemitones` only meaningful for the three two-phase kinds (`bendRelease`, `prebendBend`, `prebendRelease`).
  - `isHammerPullOrigin?: boolean`
  - `vibrato?: "slight" | "wide"`
  - `isPalmMute?: boolean`
  - `isGhost?: boolean`
- **Custom bend curves are explicitly out of scope** (see Out of Scope) — only the seven standard, parameterizable bend kinds above.
- **Rendering adapter** (`src/rendering/projectToScore.ts`, extending `buildBar`'s existing per-note mapping, not a new module):
  - `slideIn`/`slideOut` map directly to AlphaTab's `SlideInType`/`SlideOutType` enums.
  - `isHammerPullOrigin` maps directly to AlphaTab's `isHammerPullOrigin`.
  - `vibrato` maps directly to AlphaTab's `VibratoType` (note-level, not beat-level — Beat-level vibrato is out of scope, see below).
  - `isGhost` maps directly to AlphaTab's `isGhost`.
  - `bend` maps to AlphaTab's `bendType` plus a computed `bendPoints` curve: semitones convert to AlphaTab's quarter-tone units by multiplying by 2, shaped into the standard point curve for that `bendType` (e.g. a simple `Bend` is two points rising from 0 to the converted value over the note's duration; the two-phase kinds add a third point back down to the release amount).
  - `isPalmMute` maps to AlphaTab's `isPalmMute` plus a computed `palmMuteDestination`: scanning forward from each palm-muted Note through directly-following palm-muted Notes **within the same Measure** (a run never crosses a Measure boundary in v1 - see Out of Scope), the destination is the last Note in that consecutive run.
- **UI** (`MeasureGrid.tsx` or a sibling component it renders): the technique controls appear alongside the existing duration toolbar whenever a Note is selected, grouped into three sections:
  - **Slide**: two independent selects (slide-in, slide-out), each including a "none" option.
  - **Bend**: one select for the bend kind (including "none") plus one semitone number input, plus a second "release to" semitone number input that only appears for the three two-phase kinds.
  - **기타**: a hammer-on/pull-off toggle, a vibrato select (none/slight/wide), a palm-mute toggle, and a ghost-note toggle.
- **No validation**: applying any technique (including a slide-out or hammer-on/pull-off with no next Note on the same string to connect to) is always allowed, consistent with ADR-0004's existing no-validation stance - matches asking "what happens with no destination" and getting "allow it."
- **Multiple techniques per Note**: all six fields are independent; any combination is allowed, since AlphaTab's own Note model treats them the same way.

## Testing Decisions

- A good test here asserts on the AlphaTab `model.Score`/`model.Note` values `projectToScore` returns (its `slideInType`, `bendType`, `bendPoints`, `isHammerPullOrigin`, `vibrato`, `isPalmMute`, `palmMuteDestination`, `isGhost`) - never on React component internals or DOM structure. This is the same seam `projectToScore.test.ts` already tests (ADR-0002's adapter boundary) - no new seam is introduced.
- Test each technique's mapping independently: a Note with each `slideIn`/`slideOut` value produces the matching AlphaTab enum value; each of the seven bend kinds produces the right `bendType` and a `bendPoints` curve matching its semitone amount(s); `isHammerPullOrigin`/`vibrato`/`isGhost` map straight through; a run of 2-3 consecutive `isPalmMute` Notes produces the right `palmMuteDestination` chain, and a run that reaches a Measure's end does not reach into the next Measure.
- Not unit tested: the three new toolbar sections' DOM wiring (selects, number inputs, toggles) - thin UI wiring, same category as the existing duration toolbar.
- Prior art: `src/rendering/projectToScore.test.ts`'s existing style (small hand-built `Project` inputs, assertions on the returned `Score`/`Note` shape) is the pattern to extend, not replace.

## Out of Scope

- `Custom` bend type (arbitrary `BendPoint` curves) - a separate, much larger feature (a curve editor) that would need its own `/grilling` session.
- Beat-level vibrato (AlphaTab also supports vibrato on a whole Beat, not just a Note) - out of scope since our domain model's atomic unit is Note, not Beat.
- A palm-muted run crossing a Measure boundary - each run's destination is computed within a single Measure only.
- `isDead` (dead/muted-thud note) and `isStaccato` - both exist on AlphaTab's Note model but weren't requested for this spec.
- Any technique not named above (tapping, string bends via whammy bar, let-ring, etc.).
- Changing how duration, fret entry, or the overwrite editing model (ADR-0004) work - this spec only adds new optional Note fields and their UI/rendering.

## Further Notes

- Settled across a `/grilling` session that expanded scope twice beyond the ADR-0003-named three techniques (first to include vibrato/palm-mute/ghost-notes, then to include the full bend-type set and all four slide-out types) after checking AlphaTab's actual API support for each.
- `isPalmMute`'s cross-note `palmMuteDestination` computation is the one piece of real logic here (vs. a flat 1:1 field mapping like the other five techniques) - it stays inside `projectToScore.ts` rather than becoming a new module, since it only matters at AlphaTab-conversion time and the existing adapter already processes a Measure's notes in order.
