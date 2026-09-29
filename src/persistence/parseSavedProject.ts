// Turns a Save file's contents back into a Project (ticket 02 of
// .scratch/save-and-export). Shared by explicit Load and auto-save restore
// (ticket 03), so both go through the same validation.

import type { Duration, Measure, MeasureSlot, Project, TimeSignature } from "../domain/project";

const DURATIONS = new Set<Duration>(["whole", "half", "quarter", "eighth", "sixteenth"]);

function fail(reason: string): never {
  throw new Error(`Not a valid Bass Tab Editor project file: ${reason}`);
}

function isDuration(value: unknown): value is Duration {
  return typeof value === "string" && DURATIONS.has(value as Duration);
}

/** A fret, a tuning entry, or similar: a whole number, not NaN/Infinity. */
function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseTimeSignature(value: unknown): TimeSignature {
  if (typeof value !== "object" || value === null) fail("a Measure's timeSignature is missing");
  const { numerator, denominator } = value as Record<string, unknown>;
  if (!isFiniteInteger(numerator) || numerator <= 0 || !isFiniteInteger(denominator) || denominator <= 0) {
    fail("a Measure's timeSignature numerator/denominator isn't a positive whole number");
  }
  return { numerator, denominator };
}

function parseSlot(value: unknown): MeasureSlot {
  if (typeof value !== "object" || value === null) fail("a Measure has a malformed slot");
  const slot = value as Record<string, unknown>;

  if (!isDuration(slot.duration)) fail("a slot has an invalid duration");

  if (slot.kind === "rest") return { kind: "rest", duration: slot.duration };

  if (slot.kind === "note") {
    if (![1, 2, 3, 4].includes(slot.string as number)) fail("a Note has an invalid string number");
    // Matches what the live grid can ever produce (MeasureGrid's confirmEntry).
    if (!isFiniteInteger(slot.fret) || slot.fret < 0) fail("a Note has a fret that isn't a whole number >= 0");
    return { kind: "note", string: slot.string as 1 | 2 | 3 | 4, fret: slot.fret, duration: slot.duration };
  }

  fail("a slot's kind is neither \"note\" nor \"rest\"");
}

function parseMeasure(value: unknown): Measure {
  if (typeof value !== "object" || value === null) fail("a Measure is malformed");
  const measure = value as Record<string, unknown>;
  if (!Array.isArray(measure.slots)) fail("a Measure's slots is not an array");

  return {
    timeSignature: parseTimeSignature(measure.timeSignature),
    slots: measure.slots.map(parseSlot),
  };
}

/**
 * Parses a Save file's JSON text back into a Project, throwing a
 * human-readable Error if the text isn't valid JSON or doesn't have the
 * shape of a Project.
 */
export function parseSavedProject(json: string): Project {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    fail("the file isn't valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) fail("the file's contents aren't an object");
  const value = parsed as Record<string, unknown>;

  if (typeof value.title !== "string") fail("title is missing or not a string");
  if (!Array.isArray(value.tuning) || value.tuning.length !== 4 || !value.tuning.every(isFiniteInteger)) {
    fail("tuning is not an array of 4 whole numbers");
  }
  if (!Array.isArray(value.measures)) fail("measures is not an array");

  return {
    title: value.title,
    tuning: value.tuning as [number, number, number, number],
    measures: value.measures.map(parseMeasure),
  };
}
