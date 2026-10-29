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
    if (result.needsUndoSnapshot) pushes++;
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

const backspace: EntryInput = { type: "backspace" };
const insert: EntryInput = { type: "insert" };
const N = (fret: number) => ({ kind: "note", string: 4, fret, duration: "quarter" }) as const;

describe("Delete", () => {
  it("removes the selected column when nothing is typed, closing the gap", () => {
    const { project, state } = run(projectOf([N(1), N(2), N(3)]), [select(0, 1), backspace]);

    expect(project.measures[0].slots).toEqual([N(1), N(3)]);
    expect(state.cursor?.column).toBe(1);
  });

  it("does nothing on the append column", () => {
    const start = projectOf([N(1)]);

    const { project, pushes } = run(start, [select(0, 1), backspace]);

    expect(project).toBe(start);
    expect(pushes).toBe(0);
  });

  it("counts each removal as its own undo step", () => {
    const { project, pushes } = run(projectOf([N(1), N(2), N(3)]), [select(0, 0), backspace, backspace]);

    expect(project.measures[0].slots).toEqual([N(3)]);
    expect(pushes).toBe(2);
  });
});

describe("Delete, within an open entry", () => {
  it("is its own undo step even right after a change on the same column", () => {
    const { project, pushes } = run(projectOf([]), [select(0, 0), digit(5), space, backspace]);

    expect(project.measures[0].slots).toEqual([]);
    expect(pushes).toBe(2);
  });
});

describe("Insert", () => {
  it("inserts a typed Note before the cursor's column, with the last used duration", () => {
    const { project, state } = run(projectOf([N(1), N(3)]), [select(0, 1), insert, digit(2), enter]);

    expect(project.measures[0].slots).toEqual([N(1), { ...N(2), duration: "sixteenth" }, N(3)]);
    expect(state.cursor?.column).toBe(2);
  });

  it("inserts a Rest on Space and keeps it selected for cycling", () => {
    const { project } = run(projectOf([N(1), N(3)]), [select(0, 1), insert, space, space]);

    expect(project.measures[0].slots).toEqual([N(1), { kind: "rest", duration: "eighth" }, N(3)]);
  });

  it.each([
    ["a blur", { type: "blur" } as EntryInput],
    ["an empty Enter", enter],
    ["selecting another cell", select(0, 0)],
    ["Backspace", backspace],
  ])("inserts nothing and records no undo step when left by %s with nothing entered", (_, leave) => {
    const start = projectOf([N(1), N(3)]);

    const { project, pushes } = run(start, [select(0, 1), insert, leave]);

    expect(project).toBe(start);
    expect(pushes).toBe(0);
  });

  it("is its own undo step, even right after another entry on the same column", () => {
    const { project, pushes } = run(projectOf([]), [select(0, 0), digit(5), space, insert, digit(3), enter]);

    expect(project.measures[0].slots.map((s) => (s.kind === "note" ? s.fret : null))).toEqual([3, 5]);
    expect(pushes).toBe(2);
  });

  it("lands on the clicked column even though confirming the insert shifted it", () => {
    const { project, state } = run(projectOf([N(1), N(3)]), [select(0, 1), insert, digit(2), select(0, 1)]);

    expect(project.measures[0].slots.map((s) => (s.kind === "note" ? s.fret : null))).toEqual([1, 2, 3]);
    // the click was on the column holding fret 3, now at index 2
    expect(state.cursor?.column).toBe(2);
    expect(state.inserting).toBe(false);
  });

  it("is cancelled by clicking the existing column it was opened before", () => {
    const { state } = run(projectOf([N(1), N(3)]), [select(0, 1), insert, select(0, 1)]);

    expect(state.inserting).toBe(false);
  });

  it("stays open when another string of the pending column itself is clicked", () => {
    const pendingClick: EntryInput = { type: "select", cursor: { measure: 0, column: 1, string: 2 }, pending: true };

    const { state } = run(projectOf([N(1), N(3)]), [select(0, 1), insert, pendingClick]);

    expect(state.inserting).toBe(true);
    expect(state.cursor).toEqual({ measure: 0, column: 1, string: 2 });
  });

  it("is cancelled by an empty Enter, leaving the cursor on the column it was opened before", () => {
    const { state } = run(projectOf([N(1), N(3)]), [select(0, 1), insert, enter]);

    expect(state.inserting).toBe(false);
    expect(state.cursor?.column).toBe(1);
  });
});

describe("duration toolbar", () => {
  const pick = (duration: "whole" | "half" | "quarter" | "eighth" | "sixteenth"): EntryInput => ({
    type: "setDuration",
    duration,
  });

  it("sets the selected Rest's duration directly", () => {
    const { project } = run(projectOf([{ kind: "rest", duration: "eighth" }]), [select(0, 0), pick("whole")]);

    expect(project.measures[0].slots).toEqual([{ kind: "rest", duration: "whole" }]);
  });

  it("makes the picked duration the last used one", () => {
    const { project } = run(projectOf([N(1)]), [select(0, 0), pick("half"), select(0, 1), digit(2), enter]);

    expect(project.measures[0].slots[1]).toMatchObject({ fret: 2, duration: "half" });
  });

  it("confirms pending digits first, then sets that Note's duration", () => {
    const { project } = run(projectOf([]), [select(0, 0), digit(4), pick("quarter")]);

    expect(project.measures[0].slots).toEqual([{ kind: "note", string: 4, fret: 4, duration: "quarter" }]);
  });

  it("joins the entry session's single undo step instead of adding one", () => {
    const { pushes } = run(projectOf([]), [select(0, 0), space, space, pick("whole"), pick("half")]);

    expect(pushes).toBe(1);
  });
});

const left: EntryInput = { type: "move", direction: "left" };
const right: EntryInput = { type: "move", direction: "right" };
const up: EntryInput = { type: "move", direction: "up" };
const down: EntryInput = { type: "move", direction: "down" };
const tab: EntryInput = { type: "tab", reverse: false };
const shiftTab: EntryInput = { type: "tab", reverse: true };

describe("Tab and arrow-key navigation", () => {
  it("moves Tab to the next column even when nothing changed (unlike Enter)", () => {
    const { project, state, pushes } = run(projectOf([N(1), N(2)]), [select(0, 0), tab]);

    expect(state.cursor).toEqual({ measure: 0, column: 1, string: 4 });
    expect(project.measures[0].slots).toEqual([N(1), N(2)]);
    expect(pushes).toBe(0);
  });

  it("confirms typed digits before moving", () => {
    const { project, state } = run(projectOf([]), [select(0, 0), digit(5), right]);

    expect(project.measures[0].slots).toEqual([{ kind: "note", string: 4, fret: 5, duration: "sixteenth" }]);
    expect(state.cursor?.column).toBe(1);
  });

  it("moves Shift+Tab and ← to the previous column", () => {
    expect(run(projectOf([N(1), N(2)]), [select(0, 1), shiftTab]).state.cursor?.column).toBe(0);
    expect(run(projectOf([N(1), N(2)]), [select(0, 1), left]).state.cursor?.column).toBe(0);
  });

  it("continues → and Tab from an append column into the next Measure's first column", () => {
    const start = projectOf([N(1)], [N(2)]);

    expect(run(start, [select(0, 1), right]).state.cursor).toEqual({ measure: 1, column: 0, string: 4 });
    expect(run(start, [select(0, 1), tab]).state.cursor).toEqual({ measure: 1, column: 0, string: 4 });
  });

  it("goes ← from a first column back to the previous Measure's append column", () => {
    const { state } = run(projectOf([N(1), N(2)], [N(3)]), [select(1, 0), left]);

    expect(state.cursor).toEqual({ measure: 0, column: 2, string: 4 });
  });

  it("stops at the ends of the Project without creating a Measure", () => {
    const start = projectOf([N(1)]);

    const atEnd = run(start, [select(0, 1), right, tab]);
    expect(atEnd.state.cursor?.column).toBe(1);
    expect(atEnd.project.measures).toHaveLength(1);

    expect(run(start, [select(0, 0), left, shiftTab]).state.cursor?.column).toBe(0);
  });

  it("still never takes Enter into the next Measure", () => {
    const { state } = run(projectOf([], []), [select(0, 0), digit(3), enter]);

    expect(state.cursor).toEqual({ measure: 0, column: 1, string: 4 });
  });

  it("changes the string with ↑/↓, stopping at strings 1 and 4", () => {
    expect(run(projectOf([N(1)]), [select(0, 0, 3), up]).state.cursor?.string).toBe(2);
    expect(run(projectOf([N(1)]), [select(0, 0, 1), up]).state.cursor?.string).toBe(1);
    expect(run(projectOf([N(1)]), [select(0, 0, 4), down]).state.cursor?.string).toBe(4);
  });

  it("keeps the undo session on ↑/↓ but ends it on ←/→", () => {
    // Space, ↑, Space: one session on the same column -> one snapshot
    expect(run(projectOf([N(1)]), [select(0, 0), space, up, space]).pushes).toBe(1);
    // Space, →, ←, Space: the column was left in between -> two snapshots
    expect(run(projectOf([N(1)]), [select(0, 0), space, right, left, space]).pushes).toBe(2);
  });

  it("cancels a pending insert when moving off it with nothing entered", () => {
    const start = projectOf([N(1), N(3)]);

    const forward = run(start, [select(0, 1), insert, right]);
    expect(forward.project).toBe(start);
    // → from the pending column lands on the column it was opened before
    expect(forward.state).toMatchObject({ inserting: false, cursor: { column: 1 } });

    const back = run(start, [select(0, 1), insert, left]);
    expect(back.state).toMatchObject({ inserting: false, cursor: { column: 0 } });
  });

  it("confirms a pending insert with digits, then lands just after the new column", () => {
    const { project, state } = run(projectOf([N(1), N(3)]), [select(0, 1), insert, digit(2), right]);

    expect(project.measures[0].slots.map((s) => (s.kind === "note" ? s.fret : null))).toEqual([1, 2, 3]);
    expect(state.cursor?.column).toBe(2);
  });

  it("selects the last Measure's append column when nothing is selected", () => {
    const { state } = run(projectOf([N(1)], [N(2), N(3)]), [right]);

    expect(state.cursor).toEqual({ measure: 1, column: 2, string: 4 });
  });
});
