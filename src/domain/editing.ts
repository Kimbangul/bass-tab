// Pure editing operations over the Project/Measure/Note/Rest domain model
// (see CONTEXT.md). Overwrite editing model per ADR-0004: placing a Note
// replaces whatever it overlaps, and nothing outside the edited Measure
// moves. No AlphaTab or UI dependency here — see spec .scratch/note-editing.

import type { Duration, Measure, MeasureSlot, Note, Project, TimeSignature } from "./project";

// Sixteenth, not eighth: a default Note then occupies exactly one grid cell,
// so every cell click creates an independent Note. A default wider than one
// cell meant clicking the very next cell silently edited the previous Note
// instead of creating a new one - confusing in practice (real usage found
// this, see the /grilling session that led to disabling continuation cells
// in MeasureGrid below). This reasoning is specific to Notes - a Rest has no
// fret identity for a neighboring click to clobber, so DEFAULT_REST_DURATION
// keeps the original, more space-efficient default instead of picking up
// this change too.
export const DEFAULT_NOTE_DURATION: Duration = "sixteenth";
export const DEFAULT_REST_DURATION: Duration = "eighth";

const FOUR_FOUR: TimeSignature = { numerator: 4, denominator: 4 };

/** A fresh, unedited Measure: one Rest spanning the whole thing. */
export function createEmptyMeasure(timeSignature: TimeSignature = FOUR_FOUR): Measure {
  return { timeSignature, slots: [{ kind: "rest", duration: "whole" }] };
}

/** How many sixteenth-note ticks each Duration spans. */
const DURATION_TICKS: Record<Duration, number> = {
  sixteenth: 1,
  eighth: 2,
  quarter: 4,
  half: 8,
  whole: 16,
};

/** Every Duration, largest first - the canonical order for both rest
 * decomposition below and anything (e.g. a duration-picker UI) that needs
 * to list them all. */
export const DURATIONS_LARGEST_FIRST: readonly Duration[] = ["whole", "half", "quarter", "eighth", "sixteenth"];

export interface TickRange {
  slot: MeasureSlot;
  start: number;
  end: number;
}

/** Each of a Measure's slots with its [start, end) tick range, in order. */
export function tickRangesOf(measure: Measure): TickRange[] {
  let cursor = 0;
  return measure.slots.map((slot) => {
    const range: TickRange = { slot, start: cursor, end: cursor + DURATION_TICKS[slot.duration] };
    cursor = range.end;
    return range;
  });
}

/** Greedily decomposes a tick span into Rests, largest duration first. */
function restsForTicks(ticks: number): MeasureSlot[] {
  const rests: MeasureSlot[] = [];
  let remaining = ticks;
  for (const duration of DURATIONS_LARGEST_FIRST) {
    const len = DURATION_TICKS[duration];
    while (remaining >= len) {
      rests.push({ kind: "rest", duration });
      remaining -= len;
    }
  }
  return rests;
}

/**
 * Places `slot` at `tick` (sixteenth-note ticks from the start of the
 * Measure), overwriting whatever it overlaps (ADR-0004). Any gap left before
 * or after it is backfilled with Rests so the Measure keeps tiling
 * contiguously from tick 0. A slot that overflows the Measure's declared
 * capacity is placed anyway - not validated against the time signature
 * (ADR-0004).
 */
function overwriteSlotAt(measure: Measure, tick: number, slot: MeasureSlot): Measure {
  const slotEnd = tick + DURATION_TICKS[slot.duration];
  const ranges = tickRangesOf(measure);
  const totalTicks = ranges.length > 0 ? ranges[ranges.length - 1].end : 0;

  const before = ranges.filter((r) => r.end <= tick).map((r) => r.slot);
  const after = ranges.filter((r) => r.start >= slotEnd).map((r) => r.slot);
  const overlapping = ranges.filter((r) => r.start < slotEnd && r.end > tick);

  const overlapStart = overlapping.length > 0 ? overlapping[0].start : totalTicks;
  const overlapEnd = overlapping.length > 0 ? overlapping[overlapping.length - 1].end : slotEnd;

  return {
    ...measure,
    slots: [
      ...before,
      ...restsForTicks(tick - overlapStart),
      slot,
      ...restsForTicks(overlapEnd - slotEnd),
      ...after,
    ],
  };
}

/** Places a Note at `tick` - see {@link overwriteSlotAt}. */
export function placeNoteAt(measure: Measure, tick: number, note: Note): Measure {
  return overwriteSlotAt(measure, tick, note);
}

/** Places a Rest of `duration` at `tick` - see {@link overwriteSlotAt}. */
export function placeRestAt(measure: Measure, tick: number, duration: Duration): Measure {
  return overwriteSlotAt(measure, tick, { kind: "rest", duration });
}

/** The Note that starts exactly at `tick`, or null if there isn't one
 * (a Rest is there, or `tick` falls inside a Note's span without being its
 * start). Shared by changeDuration and deleteNoteAt below, which both need
 * "is this tick a Note's start" to mean the same thing. */
function noteStartingAt(measure: Measure, tick: number): Note | null {
  const range = tickRangesOf(measure).find((r) => r.start === tick);
  return range?.slot.kind === "note" ? range.slot : null;
}

/**
 * Changes the duration of the Note starting at `tick`, leaving its string
 * and fret untouched. A no-op if `tick` isn't exactly where a Note starts
 * (mid-Note ticks and Rests are left alone). Implemented as placing the
 * same Note back at the same tick with the new duration, so shrinking
 * backfills the freed ticks and growing overwrites whatever it now
 * overlaps, the same overwrite rules as placeNoteAt (ADR-0004).
 */
export function changeDuration(measure: Measure, tick: number, duration: Duration): Measure {
  const note = noteStartingAt(measure, tick);
  if (!note) return measure;

  return placeNoteAt(measure, tick, { ...note, duration });
}

/**
 * Deletes the Note starting at `tick`, replacing it with a Rest of the same
 * duration - its slot stays put, nothing shifts (ADR-0004). A no-op if
 * `tick` isn't exactly where a Note starts.
 */
export function deleteNoteAt(measure: Measure, tick: number): Measure {
  const note = noteStartingAt(measure, tick);
  if (!note) return measure;

  return placeRestAt(measure, tick, note.duration);
}

/**
 * Appends a fresh empty 4/4 Measure to the Project. Measures are never
 * created automatically elsewhere - this is the only way one gets added
 * (ADR-0003: no per-measure time-signature UI in this version).
 */
export function addMeasure(project: Project): Project {
  return { ...project, measures: [...project.measures, createEmptyMeasure()] };
}
