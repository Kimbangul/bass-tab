// Keyboard entry reducer (spec .scratch/sequence-editing): every key or click
// the grid receives becomes an EntryInput, and this pure function decides
// what it does to the Project and to the cursor. The UI only maps DOM events
// to inputs and applies the result.

import { insertSlotAt, nextDuration, previousDuration, removeSlotAt, setDurationAt, setSlotAt } from "./editing";
import type { MeasureSlot } from "./project";
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
  /**
   * True after `I`/Insert: the cursor sits on a new, still-empty column
   * opened before `cursor.column`. Entering a Note or Rest inserts it there;
   * leaving with nothing entered inserts nothing.
   */
  inserting: boolean;
}

export const INITIAL_ENTRY_STATE: EntryState = {
  cursor: null,
  digits: "",
  lastDuration: "sixteenth",
  changedThisEntry: false,
  inserting: false,
};

export type EntryInput =
  /** `pending`: the click was on the pending inserted column itself. */
  | { type: "select"; cursor: Cursor; pending?: boolean }
  | { type: "digit"; digit: number }
  | { type: "backspace" }
  | { type: "enter" }
  | { type: "space"; reverse: boolean }
  | { type: "insert" }
  /** A duration picked on the toolbar for the selected Note or Rest. */
  | { type: "setDuration"; duration: Duration }
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
  return { ...result, state: { ...result.state, cursor, digits: "", changedThisEntry: false, inserting: false } };
}

/** Puts `slot` at the cursor: into a pending inserted column when one is
 * open (closing it), otherwise replacing or appending at the cursor. */
function place(state: EntryState, project: Project, cursor: Cursor, slot: (m: Measure) => MeasureSlot): EntryResult {
  const result = edit(state, project, cursor, (measure) =>
    state.inserting
      ? insertSlotAt(measure, cursor.column, slot(measure))
      : setSlotAt(measure, cursor.column, slot(measure)),
  );
  return { ...result, state: { ...result.state, inserting: false } };
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

  const result = place(state, project, cursor, (measure) => ({
    kind: "note",
    string: cursor.string,
    fret: Number(state.digits),
    duration: state.inserting
      ? state.lastDuration
      : (measure.slots[cursor.column]?.duration ?? state.lastDuration),
  }));
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
  if (!slot || state.inserting) {
    return place(state, project, cursor, () => ({ kind: "rest", duration: state.lastDuration }));
  }

  return changeDuration(state, project, reverse ? previousDuration(slot.duration) : nextDuration(slot.duration));
}

/** Gives the cursor's column `duration` (within the entry session) and makes
 * it the last used duration. */
function changeDuration(state: EntryState, project: Project, duration: Duration): EntryResult {
  const cursor = state.cursor;
  if (!cursor || !project.measures[cursor.measure].slots[cursor.column]) return unchanged(state, project);
  const result = edit(state, project, cursor, (measure) => setDurationAt(measure, cursor.column, duration));
  return { ...result, state: { ...result.state, lastDuration: duration } };
}

/** The toolbar: confirms anything typed, then sets the duration directly. */
function pickDuration(state: EntryState, project: Project, duration: Duration): EntryResult {
  const committed = commitDigits(state, project);
  const changed = changeDuration(committed.state, committed.project, duration);
  return { ...changed, pushHistory: committed.pushHistory || changed.pushHistory };
}

/**
 * Backspace/Delete: edits pending digits when there are any; otherwise
 * cancels a pending inserted column, or removes the cursor's column (later
 * columns move up). Each removal is its own undo step.
 */
function backspace(state: EntryState, project: Project): EntryResult {
  const cursor = state.cursor;
  if (state.digits !== "") return unchanged({ ...state, digits: state.digits.slice(0, -1) }, project);
  if (state.inserting) return unchanged({ ...state, inserting: false }, project);
  if (!cursor || !project.measures[cursor.measure].slots[cursor.column]) return unchanged(state, project);

  const removed = edit(state, project, cursor, (measure) => removeSlotAt(measure, cursor.column));
  return { ...removed, state: { ...removed.state, changedThisEntry: false } };
}

/**
 * A click on a cell. It confirms what was being typed, the same as Enter.
 * Staying on the same column (another string) keeps the entry session;
 * anywhere else starts a new one.
 */
function select(state: EntryState, project: Project, target: Cursor, onPending: boolean): EntryResult {
  if (state.inserting && onPending) return unchanged({ ...state, cursor: target }, project);

  const committed = commitDigits(state, project);
  const from = state.cursor;
  // Confirming a pending insert put a new column in front of every column
  // from the insert point on, so the clicked one has moved up by one.
  const shifted =
    state.inserting && committed.project !== project && from && target.measure === from.measure && target.column >= from.column;
  const cursor = shifted ? { ...target, column: target.column + 1 } : target;

  if (!state.inserting && sameColumn(from, cursor)) {
    return { ...committed, state: { ...committed.state, cursor } };
  }
  return moveTo(committed, cursor);
}

export function applyEntryInput(state: EntryState, project: Project, input: EntryInput): EntryResult {
  switch (input.type) {
    case "select":
      return select(state, project, input.cursor, input.pending ?? false);
    case "digit":
      return unchanged({ ...state, digits: state.digits + input.digit }, project);
    case "backspace":
      return backspace(state, project);
    case "insert": {
      // Whatever was typed is confirmed first; the new column then opens
      // before the cursor's column, as a fresh entry session of its own.
      const committed = commitDigits(state, project);
      return { ...committed, state: { ...committed.state, inserting: true, changedThisEntry: false } };
    }
    case "space":
      return space(state, project, input.reverse);
    case "setDuration":
      return pickDuration(state, project, input.duration);
    case "enter": {
      // Enter finishes the column: it moves on once this entry has changed
      // something (a typed fret, a placed or cycled Rest), and otherwise
      // does nothing.
      const committed = commitDigits(state, project);
      if (!state.cursor || !committed.state.changedThisEntry) {
        return { ...committed, state: { ...committed.state, inserting: false } };
      }
      return moveTo(committed, { ...state.cursor, column: state.cursor.column + 1 });
    }
    case "blur":
      return moveTo(commitDigits(state, project), null);
  }
}
