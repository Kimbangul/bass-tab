import { describe, expect, it } from "vitest";
import { addMeasure, changeDuration, deleteNoteAt, placeNoteAt, placeRestAt } from "./editing";
import type { Measure, Project } from "./project";
import { STANDARD_BASS_TUNING } from "./project";

describe("placeNoteAt", () => {
  it("places a Note at tick 0 and backfills the rest of a whole-rest measure", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "rest", duration: "whole" }],
    };

    const result = placeNoteAt(measure, 0, { kind: "note", string: 1, fret: 3, duration: "eighth" });

    // A whole rest is 16 sixteenth-note ticks; an eighth note is 2, leaving
    // 14 ticks to backfill, greedily as half(8) + quarter(4) + eighth(2).
    expect(result.slots).toEqual([
      { kind: "note", string: 1, fret: 3, duration: "eighth" },
      { kind: "rest", duration: "half" },
      { kind: "rest", duration: "quarter" },
      { kind: "rest", duration: "eighth" },
    ]);
  });

  it("backfills a leading gap when the Note doesn't start at tick 0", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "rest", duration: "whole" }],
    };

    // Quarter note (4 ticks) placed at tick 4 of a 16-tick whole rest:
    // 4 ticks before it (-> a quarter rest) and 8 ticks after (-> a half rest).
    const result = placeNoteAt(measure, 4, { kind: "note", string: 2, fret: 5, duration: "quarter" });

    expect(result.slots).toEqual([
      { kind: "rest", duration: "quarter" },
      { kind: "note", string: 2, fret: 5, duration: "quarter" },
      { kind: "rest", duration: "half" },
    ]);
  });

  it("overwrites an existing Note it overlaps, leaving untouched Notes before it alone", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [
        { kind: "note", string: 1, fret: 0, duration: "eighth" }, // ticks 0-2
        { kind: "note", string: 1, fret: 2, duration: "eighth" }, // ticks 2-4
      ],
    };

    // Half note (8 ticks) at tick 2 fully overlaps the second eighth note
    // (2-4) but not the first (ends exactly at 2, no overlap) - the second
    // note is replaced outright, and the new note simply extends past the
    // Measure's previous 4-tick total (overflow allowed, ADR-0004).
    const result = placeNoteAt(measure, 2, { kind: "note", string: 3, fret: 5, duration: "half" });

    expect(result.slots).toEqual([
      { kind: "note", string: 1, fret: 0, duration: "eighth" },
      { kind: "note", string: 3, fret: 5, duration: "half" },
    ]);
  });

  it("removes every Note it overlaps and backfills both edges of the gap", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [
        { kind: "note", string: 1, fret: 0, duration: "eighth" }, // ticks 0-2
        { kind: "note", string: 1, fret: 2, duration: "eighth" }, // ticks 2-4
        { kind: "note", string: 1, fret: 4, duration: "eighth" }, // ticks 4-6
      ],
    };

    // Quarter note (4 ticks) at tick 1 overlaps all three eighth notes
    // (combined span 0-6): 1 tick before it and 1 tick after, each too short
    // for anything but a sixteenth rest.
    const result = placeNoteAt(measure, 1, { kind: "note", string: 2, fret: 7, duration: "quarter" });

    expect(result.slots).toEqual([
      { kind: "rest", duration: "sixteenth" },
      { kind: "note", string: 2, fret: 7, duration: "quarter" },
      { kind: "rest", duration: "sixteenth" },
    ]);
  });
});

describe("changeDuration", () => {
  it("shrinks a Note's duration, backfilling the freed ticks with Rests", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [
        { kind: "note", string: 1, fret: 3, duration: "quarter" }, // ticks 0-4
        { kind: "rest", duration: "quarter" }, // ticks 4-8
      ],
    };

    const result = changeDuration(measure, 0, "eighth");

    // Fret and string untouched; only the duration shrinks (4 -> 2 ticks),
    // freeing 2 ticks that get backfilled as an eighth rest, ahead of the
    // untouched quarter rest that was already there.
    expect(result.slots).toEqual([
      { kind: "note", string: 1, fret: 3, duration: "eighth" },
      { kind: "rest", duration: "eighth" },
      { kind: "rest", duration: "quarter" },
    ]);
  });

  it("grows a Note's duration, overwriting whatever it now overlaps", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [
        { kind: "note", string: 2, fret: 1, duration: "eighth" }, // ticks 0-2
        { kind: "rest", duration: "whole" }, // ticks 2-18 (past the measure - fine, unvalidated per ADR-0004)
      ],
    };

    const result = changeDuration(measure, 0, "quarter");

    // Growing to 4 ticks eats into the rest that followed; the leftover
    // 14 ticks of that rest are backfilled the same way placeNoteAt always
    // does (half + quarter + eighth).
    expect(result.slots).toEqual([
      { kind: "note", string: 2, fret: 1, duration: "quarter" },
      { kind: "rest", duration: "half" },
      { kind: "rest", duration: "quarter" },
      { kind: "rest", duration: "eighth" },
    ]);
  });

  it("does nothing when tick isn't the start of a Note", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "rest", duration: "whole" }],
    };

    expect(changeDuration(measure, 0, "quarter")).toEqual(measure);
    expect(changeDuration(measure, 4, "quarter")).toEqual(measure);
  });

  it("does nothing when tick falls inside a Note's span without being its start", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "note", string: 1, fret: 3, duration: "quarter" }], // ticks 0-4
    };

    expect(changeDuration(measure, 2, "eighth")).toEqual(measure);
  });
});

describe("placeRestAt", () => {
  it("places a Rest at tick 0, backfilling the remainder the same way placeNoteAt does", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "rest", duration: "whole" }],
    };

    const result = placeRestAt(measure, 0, "quarter");

    expect(result.slots).toEqual([
      { kind: "rest", duration: "quarter" },
      { kind: "rest", duration: "half" },
      { kind: "rest", duration: "quarter" },
    ]);
  });

  it("overwrites a Note it overlaps, same as placing a Note would", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "note", string: 4, fret: 2, duration: "quarter" }], // ticks 0-4
    };

    const result = placeRestAt(measure, 0, "eighth");

    expect(result.slots).toEqual([{ kind: "rest", duration: "eighth" }, { kind: "rest", duration: "eighth" }]);
  });
});

describe("addMeasure", () => {
  it("appends a fresh empty 4/4 Measure, leaving the rest of the Project untouched", () => {
    const project: Project = {
      title: "Song",
      tuning: STANDARD_BASS_TUNING,
      measures: [
        {
          timeSignature: { numerator: 4, denominator: 4 },
          slots: [{ kind: "note", string: 1, fret: 3, duration: "quarter" }],
        },
      ],
    };

    const result = addMeasure(project);

    expect(result.title).toBe("Song");
    expect(result.tuning).toBe(STANDARD_BASS_TUNING);
    expect(result.measures).toHaveLength(2);
    expect(result.measures[0]).toEqual(project.measures[0]);
    expect(result.measures[1]).toEqual({
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "rest", duration: "whole" }],
    });
  });
});

describe("deleteNoteAt", () => {
  it("replaces the Note at tick with a Rest of the same duration, leaving neighbors alone", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [
        { kind: "note", string: 1, fret: 3, duration: "eighth" }, // ticks 0-2
        { kind: "note", string: 2, fret: 5, duration: "quarter" }, // ticks 2-6
      ],
    };

    const result = deleteNoteAt(measure, 2);

    expect(result.slots).toEqual([
      { kind: "note", string: 1, fret: 3, duration: "eighth" },
      { kind: "rest", duration: "quarter" },
    ]);
  });

  it("does nothing when tick isn't the start of a Note", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "rest", duration: "whole" }],
    };

    expect(deleteNoteAt(measure, 0)).toEqual(measure);
  });

  it("does nothing when tick falls inside a Note's span without being its start", () => {
    const measure: Measure = {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [{ kind: "note", string: 1, fret: 3, duration: "quarter" }], // ticks 0-4
    };

    expect(deleteNoteAt(measure, 2)).toEqual(measure);
  });
});
