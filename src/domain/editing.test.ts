import { describe, expect, it } from "vitest";
import { addMeasure, createEmptyMeasure, insertSlotAt, removeSlotAt, setDurationAt, setSlotAt } from "./editing";
import type { Measure, MeasureSlot, Project } from "./project";
import { STANDARD_BASS_TUNING } from "./project";

const FOUR_FOUR = { numerator: 4, denominator: 4 };

function measureOf(...slots: MeasureSlot[]): Measure {
  return { timeSignature: FOUR_FOUR, slots };
}

const A: MeasureSlot = { kind: "note", string: 4, fret: 5, duration: "quarter" };
const B: MeasureSlot = { kind: "rest", duration: "eighth" };
const C: MeasureSlot = { kind: "note", string: 2, fret: 7, duration: "half" };

describe("setSlotAt", () => {
  it("replaces the slot at index, leaving its neighbors alone", () => {
    const result = setSlotAt(measureOf(A, B, C), 1, { kind: "note", string: 1, fret: 3, duration: "eighth" });

    expect(result.slots).toEqual([A, { kind: "note", string: 1, fret: 3, duration: "eighth" }, C]);
  });

  it("appends when index is one past the last slot", () => {
    const result = setSlotAt(measureOf(A), 1, B);

    expect(result.slots).toEqual([A, B]);
  });

  it("never caps a Measure at its time signature (ADR-0006)", () => {
    const full = measureOf(A, A, A, A);

    expect(setSlotAt(full, 4, A).slots).toHaveLength(5);
  });
});

describe("insertSlotAt", () => {
  it("inserts before the slot at index, moving later slots back", () => {
    expect(insertSlotAt(measureOf(A, C), 1, B).slots).toEqual([A, B, C]);
  });

  it("appends when index is one past the last slot", () => {
    expect(insertSlotAt(measureOf(A), 1, B).slots).toEqual([A, B]);
  });
});

describe("removeSlotAt", () => {
  it("removes the slot at index and closes the gap", () => {
    expect(removeSlotAt(measureOf(A, B, C), 1).slots).toEqual([A, C]);
  });

  it("does nothing for an index past the last slot", () => {
    const measure = measureOf(A);

    expect(removeSlotAt(measure, 1)).toEqual(measure);
  });
});

describe("setDurationAt", () => {
  it("changes a Note's duration, keeping its string and fret", () => {
    expect(setDurationAt(measureOf(A, B), 0, "sixteenth").slots).toEqual([{ ...A, duration: "sixteenth" }, B]);
  });

  it("changes a Rest's duration the same way", () => {
    expect(setDurationAt(measureOf(A, B), 1, "whole").slots).toEqual([A, { kind: "rest", duration: "whole" }]);
  });

  it("does nothing for an index past the last slot", () => {
    const measure = measureOf(A);

    expect(setDurationAt(measure, 1, "whole")).toEqual(measure);
  });
});

describe("createEmptyMeasure", () => {
  it("starts with no slots at all (ADR-0006)", () => {
    expect(createEmptyMeasure()).toEqual({ timeSignature: FOUR_FOUR, slots: [] });
  });
});

describe("addMeasure", () => {
  it("appends an empty 4/4 Measure, leaving the rest of the Project untouched", () => {
    const project: Project = { title: "Song", tuning: STANDARD_BASS_TUNING, measures: [measureOf(A)] };

    const result = addMeasure(project);

    expect(result.title).toBe("Song");
    expect(result.tuning).toBe(STANDARD_BASS_TUNING);
    expect(result.measures).toEqual([measureOf(A), { timeSignature: FOUR_FOUR, slots: [] }]);
  });

  it("appends a Measure in the given TimeSignature when one is passed", () => {
    const project: Project = { title: "Song", tuning: STANDARD_BASS_TUNING, measures: [] };

    const result = addMeasure(project, { numerator: 3, denominator: 4 });

    expect(result.measures).toEqual([{ timeSignature: { numerator: 3, denominator: 4 }, slots: [] }]);
  });
});
