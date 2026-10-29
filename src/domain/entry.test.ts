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

const space: EntryInput = { type: "space", reverse: false };
const shiftSpace: EntryInput = { type: "space", reverse: true };

describe("Space", () => {
  it("confirms a typed Note and keeps it selected; the next Space makes it one step longer", () => {
    const { project, state } = run(projectOf([]), [select(0, 0), digit(5), space, space, enter]);

    // first Space only confirms (1/16), the second cycles once (1/8)
    expect(project.measures[0].slots).toEqual([{ kind: "note", string: 4, fret: 5, duration: "eighth" }]);
    expect(state.cursor).toEqual({ measure: 0, column: 1, string: 4 });
  });

  it("appends a Rest of the last used duration on the append column, and keeps it selected", () => {
    const { project, state } = run(projectOf([]), [select(0, 0), space]);

    expect(project.measures[0].slots).toEqual([{ kind: "rest", duration: "sixteenth" }]);
    expect(state.cursor).toEqual({ measure: 0, column: 0, string: 4 });
  });

  it("cycles a just-placed Rest, then Enter moves on to the next column", () => {
    const { project, state } = run(projectOf([]), [select(0, 0), space, space, space, enter]);

    expect(project.measures[0].slots).toEqual([{ kind: "rest", duration: "quarter" }]);
    expect(state.cursor).toEqual({ measure: 0, column: 1, string: 4 });
  });

  it("cycles an existing Note or Rest when nothing is typed", () => {
    const start = projectOf([
      { kind: "note", string: 4, fret: 0, duration: "half" },
      { kind: "rest", duration: "eighth" },
    ]);

    const { project } = run(start, [select(0, 0), space, select(0, 1), space]);

    expect(project.measures[0].slots).toEqual([
      { kind: "note", string: 4, fret: 0, duration: "whole" },
      { kind: "rest", duration: "quarter" },
    ]);
  });

  it("cycles the other way on Shift+Space, wrapping from 1/16 to 1/1", () => {
    const start = projectOf([{ kind: "note", string: 4, fret: 0, duration: "sixteenth" }]);

    const { project } = run(start, [select(0, 0), shiftSpace]);

    expect(project.measures[0].slots[0]).toMatchObject({ duration: "whole" });
  });

  it("wraps from 1/1 back to 1/16 going forward", () => {
    const start = projectOf([{ kind: "rest", duration: "whole" }]);

    const { project } = run(start, [select(0, 0), space]);

    expect(project.measures[0].slots[0]).toMatchObject({ duration: "sixteenth" });
  });

  it("makes every cycled duration the last used one for the next new column", () => {
    const { project } = run(projectOf([]), [select(0, 0), digit(3), space, space, space, enter, digit(5), enter]);

    expect(project.measures[0].slots[1]).toEqual({ kind: "note", string: 4, fret: 5, duration: "quarter" });
  });

  it("moves later columns later in time rather than erasing them", () => {
    const later = { kind: "note", string: 2, fret: 9, duration: "quarter" } as const;
    const start = projectOf([{ kind: "rest", duration: "eighth" }, later]);

    const { project } = run(start, [select(0, 0), space, space, space]);

    expect(project.measures[0].slots).toEqual([{ kind: "rest", duration: "whole" }, later]);
  });

  it("asks for one undo snapshot per entry session, however many Space presses it has", () => {
    const { pushes } = run(projectOf([]), [
      select(0, 0),
      digit(5),
      space,
      space,
      shiftSpace,
      space,
      enter, // session 1 ends - cursor moves on
      space,
      space,
      space, // session 2: a Rest and two cycles
      select(0, 0),
      space, // session 3: cycling the first Note again
    ]);

    expect(pushes).toBe(3);
  });

  it("still does nothing on an empty Enter when the entry hasn't changed anything", () => {
    const start = projectOf([{ kind: "rest", duration: "quarter" }]);

    const { state } = run(start, [select(0, 0), enter]);

    expect(state.cursor?.column).toBe(0);
  });
});
