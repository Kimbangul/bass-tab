// Keyboard entry reducer (spec .scratch/sequence-editing): every key or click
// the grid receives becomes an EntryInput, and this pure function decides
// what it does to the Project and to the cursor. The UI only maps DOM events
// to inputs and applies the result.

import { nextDuration, previousDuration, setDurationAt, setSlotAt } from "./editing";
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
  /** Duration a new column gets - updated by every duration the user picks. */
  lastDuration: Duration;
  /**
   * Whether the current entry session has already changed the Project. A
   * session lasts from arriving at a column until the cursor leaves it;
   * only its first change asks for an undo snapshot, so placing a Rest and
   * cycling it four times undoes in one step.
   */
  changedThisEntry: boolean;
}

export const INITIAL_ENTRY_STATE: EntryState = {
  cursor: null,
  digits: "",
  lastDuration: "sixteenth",
  changedThisEntry: false,
};

export type EntryInput =
  | { type: "select"; cursor: Cursor }
  | { type: "digit"; digit: number }
  | { type: "backspace" }
  | { type: "enter" }
  | { type: "space"; reverse: boolean }
  | { type: "blur" };

export interface EntryResult {
  state: EntryState;
  project: Project;
  /** True when the caller should push the pre-change Project onto undo history. */
  pushHistory: boolean;
}

function unchanged(state: EntryState, project: Project): EntryResult {
  return { state, project, pushHistory: false };
}

/** Applies `update` to the cursor's Measure as part of the current entry
 * session, asking for an undo snapshot only on the session's first change. */
function edit(state: EntryState, project: Project, cursor: Cursor, update: (m: Measure) => Measure): EntryResult {
  const measures = [...project.measures];
  measures[cursor.measure] = update(measures[cursor.measure]);
  return {
    state: { ...state, changedThisEntry: true },
    project: { ...project, measures },
    pushHistory: !state.changedThisEntry,
  };
}

/** Points the cursor elsewhere (or nowhere), ending the entry session. */
function moveTo(result: EntryResult, cursor: Cursor | null): EntryResult {
  return { ...result, state: { ...result.state, cursor, digits: "", changedThisEntry: false } };
}

function sameColumn(a: Cursor | null, b: Cursor): boolean {
  return a !== null && a.measure === b.measure && a.column === b.column;
}

/**
 * Turns the pending digits into a Note at the cursor, clearing them. A new
 * column takes the last used duration; replacing keeps the replaced
 * column's duration, so fixing a fret never disturbs the rhythm. With no
 * digits pending (or no cursor) nothing changes.
 */
function commitDigits(state: EntryState, project: Project): EntryResult {
  const cursor = state.cursor;
  if (!cursor || state.digits === "") return unchanged(state, project);

  const result = edit(state, project, cursor, (measure) =>
    setSlotAt(measure, cursor.column, {
      kind: "note",
      string: cursor.string,
      fret: Number(state.digits),
      duration: measure.slots[cursor.column]?.duration ?? state.lastDuration,
    }),
  );
  return { ...result, state: { ...result.state, digits: "" } };
}

/**
 * Space: with digits pending, confirm the Note and stay on it; on the
 * append column, add a Rest and stay on it; on an existing Note or Rest,
 * cycle its duration one step (backward when `reverse`).
 */
function space(state: EntryState, project: Project, reverse: boolean): EntryResult {
  const cursor = state.cursor;
  if (!cursor) return unchanged(state, project);
  if (state.digits !== "") return commitDigits(state, project);

  const slot = project.measures[cursor.measure].slots[cursor.column];
  if (!slot) {
    return edit(state, project, cursor, (measure) =>
      setSlotAt(measure, cursor.column, { kind: "rest", duration: state.lastDuration }),
    );
  }

  const duration = reverse ? previousDuration(slot.duration) : nextDuration(slot.duration);
  const result = edit(state, project, cursor, (measure) => setDurationAt(measure, cursor.column, duration));
  return { ...result, state: { ...result.state, lastDuration: duration } };
}

export function applyEntryInput(state: EntryState, project: Project, input: EntryInput): EntryResult {
  switch (input.type) {
    case "select": {
      // Clicking elsewhere confirms what was being typed, same as Enter.
      const committed = commitDigits(state, project);
      if (sameColumn(state.cursor, input.cursor)) {
        return { ...committed, state: { ...committed.state, cursor: input.cursor } };
      }
      return moveTo(committed, input.cursor);
    }
    case "digit":
      return unchanged({ ...state, digits: state.digits + input.digit }, project);
    case "backspace":
      return unchanged({ ...state, digits: state.digits.slice(0, -1) }, project);
    case "space":
      return space(state, project, input.reverse);
    case "enter": {
      // Enter finishes the column: it moves on once this entry has changed
      // something (a typed fret, a placed or cycled Rest), and otherwise
      // does nothing.
      const committed = commitDigits(state, project);
      if (!state.cursor || !committed.state.changedThisEntry) return committed;
      return moveTo(committed, { ...state.cursor, column: state.cursor.column + 1 });
    }
    case "blur":
      return moveTo(commitDigits(state, project), null);
  }
}
