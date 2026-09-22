import { model } from "@coderline/alphatab";
import { describe, expect, it } from "vitest";
import type { Project } from "../domain/project";
import { STANDARD_BASS_TUNING } from "../domain/project";
import { projectToScore } from "./projectToScore";

describe("projectToScore", () => {
  it("carries the title and standard bass tuning onto a tab-only staff", () => {
    const project: Project = {
      title: "Honey (Are You Coming?)",
      tuning: STANDARD_BASS_TUNING,
      measures: [],
    };

    const score = projectToScore(project);
    const staff = score.tracks[0].staves[0];

    expect(score.title).toBe("Honey (Are You Coming?)");
    expect(staff.stringTuning.tunings).toEqual([43, 38, 33, 28]);
    expect(staff.showTablature).toBe(true);
    expect(staff.showStandardNotation).toBe(false);
  });

  it("adds one masterBar per Measure, carrying its time signature", () => {
    const project: Project = {
      title: "Untitled",
      tuning: STANDARD_BASS_TUNING,
      measures: [
        {
          timeSignature: { numerator: 4, denominator: 4 },
          slots: [{ kind: "rest", duration: "whole" }],
        },
      ],
    };

    const score = projectToScore(project);

    expect(score.masterBars.length).toBe(1);
    expect(score.masterBars[0].timeSignatureNumerator).toBe(4);
    expect(score.masterBars[0].timeSignatureDenominator).toBe(4);
  });

  it("maps a Note's string number to AlphaTab's convention (1 = lowest string, not highest)", () => {
    const project: Project = {
      title: "Untitled",
      tuning: STANDARD_BASS_TUNING,
      measures: [
        {
          timeSignature: { numerator: 4, denominator: 4 },
          // string 1 is the highest-pitched string (G) in our domain model.
          slots: [{ kind: "note", string: 1, fret: 3, duration: "quarter" }],
        },
      ],
    };

    const score = projectToScore(project);
    const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];

    expect(beat.isEmpty).toBe(false);
    expect(beat.duration).toBe(model.Duration.Quarter);
    expect(beat.notes.length).toBe(1);
    expect(beat.notes[0].fret).toBe(3);
    // AlphaTab numbers strings from the lowest string up, so our highest
    // string (1) must land on AlphaTab's highest number (4 on a 4-string bass).
    expect(beat.notes[0].string).toBe(4);
  });

  it("keeps notes and rests in order across multiple measures", () => {
    const project: Project = {
      title: "Untitled",
      tuning: STANDARD_BASS_TUNING,
      measures: [
        {
          timeSignature: { numerator: 4, denominator: 4 },
          slots: [
            { kind: "note", string: 4, fret: 0, duration: "eighth" },
            { kind: "rest", duration: "eighth" },
          ],
        },
        {
          timeSignature: { numerator: 4, denominator: 4 },
          slots: [{ kind: "note", string: 3, fret: 5, duration: "half" }],
        },
      ],
    };

    const score = projectToScore(project);
    const bars = score.tracks[0].staves[0].bars;

    expect(bars.length).toBe(2);

    const firstMeasureBeats = bars[0].voices[0].beats;
    expect(firstMeasureBeats.map((b) => b.isEmpty)).toEqual([false, true]);
    expect(firstMeasureBeats[0].notes[0].fret).toBe(0);
    // our string 4 (lowest, E) -> AlphaTab string 1 (its lowest)
    expect(firstMeasureBeats[0].notes[0].string).toBe(1);

    const secondMeasureBeats = bars[1].voices[0].beats;
    expect(secondMeasureBeats.length).toBe(1);
    expect(secondMeasureBeats[0].duration).toBe(model.Duration.Half);
    // our string 3 (D) -> AlphaTab string 2
    expect(secondMeasureBeats[0].notes[0].string).toBe(2);
  });

  it("finishes the score so it's actually renderable (populates derived beat fields)", () => {
    const project: Project = {
      title: "Untitled",
      tuning: STANDARD_BASS_TUNING,
      measures: [
        {
          timeSignature: { numerator: 4, denominator: 4 },
          slots: [{ kind: "note", string: 1, fret: 3, duration: "quarter" }],
        },
      ],
    };

    const score = projectToScore(project);
    const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];

    // AlphaTab's renderer reads these (beaming, note positioning) and every
    // built-in importer calls Score#finish() to populate them before handing
    // the score to AlphaTabApi. An un-finished score renders incorrectly.
    expect(beat.minNote).not.toBeNull();
    expect(beat.maxNote).not.toBeNull();
  });
});
