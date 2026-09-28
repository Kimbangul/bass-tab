import { describe, expect, it } from "vitest";
import { placeNoteAt } from "./editing";
import type { Measure } from "./project";

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
