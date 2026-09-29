import { describe, expect, it } from "vitest";
import { STANDARD_BASS_TUNING } from "../domain/project";
import type { Project } from "../domain/project";
import { parseSavedProject } from "./parseSavedProject";

describe("parseSavedProject", () => {
  it("parses a valid Save file back into an equivalent Project", () => {
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

    expect(parseSavedProject(JSON.stringify(project))).toEqual(project);
  });

  it("throws on text that isn't valid JSON", () => {
    expect(() => parseSavedProject("{not json")).toThrow();
  });

  it("throws on valid JSON that isn't shaped like a Project", () => {
    expect(() => parseSavedProject(JSON.stringify({ hello: "world" }))).toThrow();
  });

  it("throws when a slot's duration isn't one of the known Durations", () => {
    const badProject = {
      title: "Song",
      tuning: STANDARD_BASS_TUNING,
      measures: [
        {
          timeSignature: { numerator: 4, denominator: 4 },
          slots: [{ kind: "rest", duration: "thirty-second" }],
        },
      ],
    };

    expect(() => parseSavedProject(JSON.stringify(badProject))).toThrow();
  });

  it("throws when a Note's fret is negative, non-integer, or non-finite", () => {
    const projectWith = (fret: unknown) =>
      JSON.stringify({
        title: "Song",
        tuning: STANDARD_BASS_TUNING,
        measures: [
          { timeSignature: { numerator: 4, denominator: 4 }, slots: [{ kind: "note", string: 1, fret, duration: "quarter" }] },
        ],
      });

    expect(() => parseSavedProject(projectWith(-1))).toThrow();
    expect(() => parseSavedProject(projectWith(1.5))).toThrow();
    expect(() => parseSavedProject(projectWith(Number.NaN))).toThrow();
  });

  it("throws when a Measure's time signature numerator/denominator isn't a positive integer", () => {
    const projectWith = (numerator: unknown, denominator: unknown) =>
      JSON.stringify({
        title: "Song",
        tuning: STANDARD_BASS_TUNING,
        measures: [{ timeSignature: { numerator, denominator }, slots: [] }],
      });

    expect(() => parseSavedProject(projectWith(0, 4))).toThrow();
    expect(() => parseSavedProject(projectWith(4, -4))).toThrow();
    expect(() => parseSavedProject(projectWith(4.5, 4))).toThrow();
  });

  it("throws when tuning contains a non-integer or non-finite value", () => {
    const projectWith = (tuning: unknown) => JSON.stringify({ title: "Song", tuning, measures: [] });

    expect(() => parseSavedProject(projectWith([43, 38, 33.5, 28]))).toThrow();
    expect(() => parseSavedProject(projectWith([43, 38, Number.NaN, 28]))).toThrow();
  });
});
