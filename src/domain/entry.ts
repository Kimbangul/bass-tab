// Keyboard entry reducer (spec .scratch/sequence-editing): every key or click
// the grid receives becomes an EntryInput, and this pure function decides
// what it does to the Project and to the cursor. The UI only maps DOM events
// to inputs and applies the result.

import { setSlotAt } from "./editing";
import type { Duration, Measure, Project, StringNumber } from "./project";

/** Where the next keystroke lands. `column === slots.length` is the
 * Measure's append column. */
export interface Cursor {
  measure: number;
  column: number;
  string: StringNumber;
}

export interface EntryState {
  /** null when nothing is selected. */
  cursor: Cursor | null;
  /** Fret digits typed at the cursor but not yet confirmed. */
  digits: string;
  /** Duration a new column gets. */
  lastDuration: Duration;
}

export const INITIAL_ENTRY_STATE: EntryState = {
  cursor: null,
  digits: "",
  lastDuration: "sixteenth",
};

export type EntryInput =
  | { type: "select"; cursor: Cursor }
  | { type: "digit"; digit: number }
  | { type: "backspace" }
  | { type: "enter" }
  | { type: "blur" };

export interface EntryResult {
  state: EntryState;
  project: Project;
  /** True when the caller should push the pre-change Project onto undo history. */
  pushHistory: boolean;
}

function updateMeasure(project: Project, index: number, update: (measure: Measure) => Measure): Project {
  const measures = [...project.measures];
  measures[index] = update(measures[index]);
  return { ...project, measures };
}

/**
 * Turns the pending digits into a Note at the cursor, clearing them. A new
 * column takes the last used duration; replacing keeps the replaced
 * column's duration, so fixing a fret never disturbs the rhythm. With no
 * digits pending (or no cursor) nothing changes.
 */
function commitDigits(state: EntryState, project: Project): EntryResult {
  const cursor = state.cursor;
  if (!cursor || state.digits === "") return { state, project, pushHistory: false };

  const next = updateMeasure(project, cursor.measure, (measure) =>
    setSlotAt(measure, cursor.column, {
      kind: "note",
      string: cursor.string,
      fret: Number(state.digits),
      duration: measure.slots[cursor.column]?.duration ?? state.lastDuration,
    }),
  );
  return { state: { ...state, digits: "" }, project: next, pushHistory: true };
}

export function applyEntryInput(state: EntryState, project: Project, input: EntryInput): EntryResult {
  switch (input.type) {
    case "select": {
      // Clicking elsewhere confirms what was being typed, same as Enter.
      const committed = commitDigits(state, project);
      return { ...committed, state: { ...committed.state, cursor: input.cursor } };
    }
    case "digit":
      return { state: { ...state, digits: state.digits + input.digit }, project, pushHistory: false };
    case "backspace":
      return { state: { ...state, digits: state.digits.slice(0, -1) }, project, pushHistory: false };
    case "enter": {
      const committed = commitDigits(state, project);
      if (!committed.pushHistory || !state.cursor) return committed;
      const cursor = { ...state.cursor, column: state.cursor.column + 1 };
      return { ...committed, state: { ...committed.state, cursor } };
    }
    case "blur": {
      const committed = commitDigits(state, project);
      return { ...committed, state: { ...committed.state, cursor: null } };
    }
  }
}
