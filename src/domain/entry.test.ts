import { describe, expect, it } from "vitest";
import { applyEntryInput, INITIAL_ENTRY_STATE, type EntryInput, type EntryState } from "./entry";
import type { MeasureSlot, Project } from "./project";
import { STANDARD_BASS_TUNING } from "./project";

function projectOf(...measures: MeasureSlot[][]): Project {
  return {
    title: "Song",
    tuning: STANDARD_BASS_TUNING,
    measures: measures.map((slots) => ({ timeSignature: { numerator: 4, denominator: 4 }, slots })),
  };
}

/** Feeds `inputs` through the reducer in order, collecting how many history
 * pushes the caller would have made along the way. */
function run(project: Project, inputs: EntryInput[], state: EntryState = INITIAL_ENTRY_STATE) {
  let pushes = 0;
  for (const input of inputs) {
    const result = applyEntryInput(state, project, input);
    if (result.pushHistory) pushes++;
    state = result.state;
    project = result.project;
  }
  return { state, project, pushes };
}

const select = (measure: number, column: number, string: 1 | 2 | 3 | 4 = 4): EntryInput => ({
  type: "select",
  cursor: { measure, column, string },
});
const digit = (d: number): EntryInput => ({ type: "digit", digit: d });
const enter: EntryInput = { type: "enter" };

describe("digits + Enter", () => {
  it("appends a Note on the append column with the last used duration, then moves to the next column", () => {
    const { project, state } = run(projectOf([]), [select(0, 0, 3), digit(5), enter]);

    expect(project.measures[0].slots).toEqual([{ kind: "note", string: 3, fret: 5, duration: "sixteenth" }]);
    expect(state.cursor).toEqual({ measure: 0, column: 1, string: 3 });
    expect(state.digits).toBe("");
  });

  it("replaces an existing Note or Rest with a Note on the selected string, keeping its duration", () => {
    const start = projectOf([
      { kind: "rest", duration: "half" },
      { kind: "note", string: 4, fret: 0, duration: "quarter" },
    ]);

    const { project } = run(start, [select(0, 0, 2), digit(7), enter, select(0, 1, 1), digit(9), enter]);

    expect(project.measures[0].slots).toEqual([
      { kind: "note", string: 2, fret: 7, duration: "half" },
      { kind: "note", string: 1, fret: 9, duration: "quarter" },
    ]);
  });
});

describe("confirming and abandoning an entry", () => {
  it("reads several digits as one fret", () => {
    const { project } = run(projectOf([]), [select(0, 0), digit(1), digit(2), enter]);

    expect(project.measures[0].slots[0]).toMatchObject({ fret: 12 });
  });

  it("changes nothing on an empty Enter, and leaves the cursor where it is", () => {
    const start = projectOf([{ kind: "rest", duration: "quarter" }]);

    const { project, state, pushes } = run(start, [select(0, 0), enter]);

    expect(project).toBe(start);
    expect(state.cursor).toEqual({ measure: 0, column: 0, string: 4 });
    expect(pushes).toBe(0);
  });

  it("stays in the same Measure at its end - the cursor lands on its append column, no Measure is created", () => {
    const { project, state } = run(projectOf([], []), [select(0, 0), digit(3), enter, digit(5), enter]);

    expect(project.measures).toHaveLength(2);
    expect(project.measures[0].slots).toHaveLength(2);
    expect(state.cursor).toEqual({ measure: 0, column: 2, string: 4 });
  });

  it("confirms pending digits on blur, then deselects", () => {
    const { project, state } = run(projectOf([]), [select(0, 0), digit(4), { type: "blur" }]);

    expect(project.measures[0].slots).toEqual([{ kind: "note", string: 4, fret: 4, duration: "sixteenth" }]);
    expect(state.cursor).toBeNull();
  });

  it("confirms pending digits at the old cell when another cell is selected", () => {
    const start = projectOf([{ kind: "rest", duration: "quarter" }]);

    const { project, state } = run(start, [select(0, 0, 2), digit(4), select(0, 1, 3)]);

    expect(project.measures[0].slots).toEqual([{ kind: "note", string: 2, fret: 4, duration: "quarter" }]);
    expect(state.cursor).toEqual({ measure: 0, column: 1, string: 3 });
  });

  it("lets Backspace edit pending digits instead of the Measure", () => {
    const { project } = run(projectOf([]), [select(0, 0), digit(1), digit(2), { type: "backspace" }, enter]);

    expect(project.measures[0].slots[0]).toMatchObject({ fret: 1 });
  });

  it("asks for one undo snapshot per confirmed entry", () => {
    const { pushes } = run(projectOf([]), [select(0, 0), digit(3), enter, digit(5), enter, digit(7), { type: "blur" }]);

    expect(pushes).toBe(3);
  });
});
