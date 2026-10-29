// Pure editing operations over the Project/Measure/Note/Rest domain model
// (see CONTEXT.md). Sequence editing model per ADR-0006: a Measure is an
// ordered list of slots addressed by index; nothing is overwritten or
// backfilled, and a Measure is never capped at its time signature. No
// AlphaTab or UI dependency here - see spec .scratch/sequence-editing.

import type { Duration, Measure, MeasureSlot, Project, TimeSignature } from "./project";

const FOUR_FOUR: TimeSignature = { numerator: 4, denominator: 4 };

/** Every Duration, largest first - the order the duration toolbar lists them in. */
export const DURATIONS_LARGEST_FIRST: readonly Duration[] = ["whole", "half", "quarter", "eighth", "sixteenth"];

/** The order Space cycles a duration through, shortest first. */
const DURATION_CYCLE: readonly Duration[] = ["sixteenth", "eighth", "quarter", "half", "whole"];

/** One step longer, wrapping from whole back to sixteenth. */
export function nextDuration(duration: Duration): Duration {
  return DURATION_CYCLE[(DURATION_CYCLE.indexOf(duration) + 1) % DURATION_CYCLE.length];
}

/** One step shorter, wrapping from sixteenth back to whole. */
export function previousDuration(duration: Duration): Duration {
  const length = DURATION_CYCLE.length;
  return DURATION_CYCLE[(DURATION_CYCLE.indexOf(duration) - 1 + length) % length];
}

/** A fresh Measure: no slots at all (ADR-0006). */
export function createEmptyMeasure(timeSignature: TimeSignature = FOUR_FOUR): Measure {
  return { timeSignature, slots: [] };
}

function withSlots(measure: Measure, slots: MeasureSlot[]): Measure {
  return { ...measure, slots };
}

/** Replaces the slot at `index`; `index === slots.length` appends instead. */
export function setSlotAt(measure: Measure, index: number, slot: MeasureSlot): Measure {
  const slots = [...measure.slots];
  slots[index] = slot;
  return withSlots(measure, slots);
}

/** Inserts `slot` before the slot at `index` (or appends at `slots.length`). */
export function insertSlotAt(measure: Measure, index: number, slot: MeasureSlot): Measure {
  return withSlots(measure, [...measure.slots.slice(0, index), slot, ...measure.slots.slice(index)]);
}

/** Removes the slot at `index`; later slots move up. No-op past the end. */
export function removeSlotAt(measure: Measure, index: number): Measure {
  if (index >= measure.slots.length) return measure;
  return withSlots(measure, measure.slots.filter((_, i) => i !== index));
}

/** Changes the duration of the Note or Rest at `index`. No-op past the end. */
export function setDurationAt(measure: Measure, index: number, duration: Duration): Measure {
  const slot = measure.slots[index];
  if (!slot) return measure;
  return setSlotAt(measure, index, { ...slot, duration });
}

/**
 * Appends a fresh empty Measure to the Project, in `timeSignature` (default
 * 4/4). Measures are never created automatically elsewhere - this is the
 * only way one gets added.
 */
export function addMeasure(project: Project, timeSignature?: TimeSignature): Project {
  return { ...project, measures: [...project.measures, createEmptyMeasure(timeSignature)] };
}
