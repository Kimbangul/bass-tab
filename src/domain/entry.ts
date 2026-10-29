// Keyboard entry reducer (spec .scratch/sequence-editing): every key or click
// the grid receives becomes an EntryInput, and this pure function decides
// what it does to the Project and to the cursor. The UI only maps DOM events
// to inputs and applies the result.

import { insertSlotAt, nextDuration, previousDuration, removeSlotAt, setDurationAt, setSlotAt } from "./editing";
import type { Duration, Measure, MeasureSlot, Project, StringNumber } from "./project";

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
  /** Arrow keys: ←/→ move between columns (crossing Measures), ↑/↓ between strings. */
  | { type: "move"; direction: "left" | "right" | "up" | "down" }
  /** Tab / Shift+Tab: the same column moves as →/←. */
  | { type: "tab"; reverse: boolean }
  | { type: "blur" };

export interface EntryResult {
  state: EntryState;
  project: Project;
  /** True when the caller should push the pre-change Project onto undo history. */
  needsUndoSnapshot: boolean;
}

/** A result that leaves the Project as it was (the entry state may differ). */
function projectUnchanged(state: EntryState, project: Project): EntryResult {
  return { state, project, needsUndoSnapshot: false };
}

/** `result` with `patch` applied to its entry state. */
function withState(result: EntryResult, patch: Partial<EntryState>): EntryResult {
  return { ...result, state: { ...result.state, ...patch } };
}

/** The Note or Rest at `cursor`, or undefined on an append column. */
function slotAt(project: Project, cursor: Cursor): MeasureSlot | undefined {
  return project.measures[cursor.measure].slots[cursor.column];
}

/** Applies `update` to the cursor's Measure as part of the current entry
 * session, asking for an undo snapshot only on the session's first change. */
function editMeasure(state: EntryState, project: Project, cursor: Cursor, update: (m: Measure) => Measure): EntryResult {
  const measures = [...project.measures];
  measures[cursor.measure] = update(measures[cursor.measure]);
  return {
    state: { ...state, changedThisEntry: true },
    project: { ...project, measures },
    needsUndoSnapshot: !state.changedThisEntry,
  };
}

/** Points the cursor elsewhere (or nowhere), ending the entry session. */
function endEntryAt(result: EntryResult, cursor: Cursor | null): EntryResult {
  return withState(result, { cursor, digits: "", changedThisEntry: false, inserting: false });
}

/** Puts `slot` at the cursor: into a pending inserted column when one is
 * open (closing it), otherwise replacing or appending at the cursor. */
function placeAtCursor(
  state: EntryState,
  project: Project,
  cursor: Cursor,
  slot: (m: Measure) => MeasureSlot,
): EntryResult {
  const result = editMeasure(state, project, cursor, (measure) =>
    state.inserting
      ? insertSlotAt(measure, cursor.column, slot(measure))
      : setSlotAt(measure, cursor.column, slot(measure)),
  );
  return withState(result, { inserting: false });
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
  if (!cursor || state.digits === "") return projectUnchanged(state, project);

  const result = placeAtCursor(state, project, cursor, (measure) => ({
    kind: "note",
    string: cursor.string,
    fret: Number(state.digits),
    duration: state.inserting
      ? state.lastDuration
      : (measure.slots[cursor.column]?.duration ?? state.lastDuration),
  }));
  return withState(result, { digits: "" });
}

/**
 * Moves the cursor to `target`, given in the columns as they are on screen
 * before this input (a pending inserted column not yet counted). Pending
 * digits are confirmed first. If that confirmed a pending insert, every
 * column from the insert point on has moved up by one, so `target` is
 * shifted to match. Staying in the same column (another string) keeps the
 * entry session; anywhere else starts a new one.
 */
function goTo(state: EntryState, project: Project, target: Cursor): EntryResult {
  const committed = commitDigits(state, project);
  const from = state.cursor;
  const insertConfirmed = state.inserting && committed.project !== project;
  const shifted = insertConfirmed && from && target.measure === from.measure && target.column >= from.column;
  const cursor = shifted ? { ...target, column: target.column + 1 } : target;

  if (!state.inserting && sameColumn(from, cursor)) return withState(committed, { cursor });
  return endEntryAt(committed, cursor);
}

/**
 * Space: with digits pending, confirm the Note and stay on it; on the
 * append column, add a Rest and stay on it; on an existing Note or Rest,
 * cycle its duration one step (backward when `reverse`).
 */
function space(state: EntryState, project: Project, reverse: boolean): EntryResult {
  const cursor = state.cursor;
  if (!cursor) return projectUnchanged(state, project);
  if (state.digits !== "") return commitDigits(state, project);

  const slot = slotAt(project, cursor);
  if (!slot || state.inserting) {
    return placeAtCursor(state, project, cursor, () => ({ kind: "rest", duration: state.lastDuration }));
  }

  return changeDuration(state, project, reverse ? previousDuration(slot.duration) : nextDuration(slot.duration));
}

/** Gives the cursor's column `duration` (within the entry session) and makes
 * it the last used duration. */
function changeDuration(state: EntryState, project: Project, duration: Duration): EntryResult {
  const cursor = state.cursor;
  if (!cursor || !slotAt(project, cursor)) return projectUnchanged(state, project);
  const result = editMeasure(state, project, cursor, (measure) => setDurationAt(measure, cursor.column, duration));
  return withState(result, { lastDuration: duration });
}

/** The toolbar: confirms anything typed, then sets the duration directly. */
function pickDuration(state: EntryState, project: Project, duration: Duration): EntryResult {
  const committed = commitDigits(state, project);
  const changed = changeDuration(committed.state, committed.project, duration);
  return { ...changed, needsUndoSnapshot: committed.needsUndoSnapshot || changed.needsUndoSnapshot };
}

/**
 * Backspace/Delete: edits pending digits when there are any; otherwise
 * cancels a pending inserted column, or removes the cursor's column (later
 * columns move up). Each removal is its own undo step.
 */
function backspace(state: EntryState, project: Project): EntryResult {
  const cursor = state.cursor;
  if (state.digits !== "") return projectUnchanged({ ...state, digits: state.digits.slice(0, -1) }, project);
  if (state.inserting) return projectUnchanged({ ...state, inserting: false }, project);
  if (!cursor || !slotAt(project, cursor)) return projectUnchanged(state, project);

  // A removal starts and ends its own session, so it is always one undo
  // step of its own - never folded into an edit made just before it.
  const removed = editMeasure({ ...state, changedThisEntry: false }, project, cursor, (measure) =>
    removeSlotAt(measure, cursor.column),
  );
  return withState(removed, { changedThisEntry: false });
}

/** The last Measure's append column, on the bottom string - where keyboard
 * navigation starts when nothing is selected. */
function lastAppendColumn(project: Project): Cursor | null {
  const measure = project.measures.length - 1;
  if (measure < 0) return null;
  return { measure, column: project.measures[measure].slots.length, string: 4 };
}

/**
 * ←/→ and Shift+Tab/Tab: confirm anything typed, then move one column. The
 * neighbor is worked out after confirming, so typing on an append column
 * and pressing → lands on the new append column. Off a pending inserted
 * column (nothing typed), → lands on the column it was opened before and
 * ← on the one before that. Past a Measure's append column the cursor
 * continues into the next Measure's first column, and before a first
 * column into the previous Measure's append column. The ends of the
 * Project stop it. Any actual move ends the entry session.
 */
function moveColumn(state: EntryState, project: Project, delta: 1 | -1): EntryResult {
  if (!state.cursor) return projectUnchanged({ ...state, cursor: lastAppendColumn(project) }, project);

  const committed = commitDigits(state, project);
  const from = committed.state.cursor!;
  const measures = committed.project.measures;
  const pendingInsert = committed.state.inserting;
  let measure = from.measure;
  let column = pendingInsert && delta === 1 ? from.column : from.column + delta;

  if (column > measures[measure].slots.length) {
    if (measure + 1 >= measures.length) return committed;
    measure += 1;
    column = 0;
  } else if (column < 0) {
    if (measure === 0) return committed;
    measure -= 1;
    column = measures[measure].slots.length;
  }
  return endEntryAt(committed, { ...from, measure, column });
}

/** ↑/↓: confirm anything typed, then move to the neighboring string of the
 * same column, stopping at strings 1 and 4. The entry session stays open,
 * as it does for a click on another string of the same column. */
function moveString(state: EntryState, project: Project, delta: 1 | -1): EntryResult {
  if (!state.cursor) return projectUnchanged({ ...state, cursor: lastAppendColumn(project) }, project);

  const committed = commitDigits(state, project);
  const from = committed.state.cursor!;
  const string = Math.min(4, Math.max(1, from.string + delta)) as StringNumber;
  return withState(committed, { cursor: { ...from, string } });
}

/** A click on a cell - see {@link goTo}. A click on another string of the
 * pending inserted column itself just changes the string. */
function select(state: EntryState, project: Project, target: Cursor, onPending: boolean): EntryResult {
  if (state.inserting && onPending) return projectUnchanged({ ...state, cursor: target }, project);
  return goTo(state, project, target);
}

export function applyEntryInput(state: EntryState, project: Project, input: EntryInput): EntryResult {
  switch (input.type) {
    case "select":
      return select(state, project, input.cursor, input.pending ?? false);
    case "digit":
      return projectUnchanged({ ...state, digits: state.digits + input.digit }, project);
    case "backspace":
      return backspace(state, project);
    case "insert":
      // Whatever was typed is confirmed first; the new column then opens
      // before the cursor's column, as a fresh entry session of its own.
      return withState(commitDigits(state, project), { inserting: true, changedThisEntry: false });
    case "space":
      return space(state, project, input.reverse);
    case "setDuration":
      return pickDuration(state, project, input.duration);
    case "enter": {
      // Enter finishes the column: it moves on once this entry has changed
      // something (a typed fret, a placed or cycled Rest), and otherwise
      // does nothing.
      const committed = commitDigits(state, project);
      if (!state.cursor || !committed.state.changedThisEntry) return withState(committed, { inserting: false });
      return endEntryAt(committed, { ...state.cursor, column: state.cursor.column + 1 });
    }
    case "move":
      if (input.direction === "up") return moveString(state, project, -1);
      if (input.direction === "down") return moveString(state, project, 1);
      return moveColumn(state, project, input.direction === "right" ? 1 : -1);
    case "tab":
      return moveColumn(state, project, input.reverse ? -1 : 1);
    case "blur":
      return endEntryAt(commitDigits(state, project), null);
  }
}
