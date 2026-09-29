// A generic past/future history stack (spec .scratch/undo-redo). Deliberately
// knows nothing about Project, Measure, or any other domain type - callers
// (App.tsx, per ticket 02) hold the "current" value themselves as their own
// state and pass it in on each undo/redo; this module only ever tracks the
// snapshots on either side of it. Pure and immutable, matching editing.ts and
// pageSplitting.ts: every function returns a new History rather than
// mutating its argument.

export interface History<T> {
  readonly past: readonly T[];
  readonly future: readonly T[];
}

/** Result of an undo/redo step: the History to store, plus the value the
 * caller should now treat as current (unchanged from the input `current` if
 * the requested direction had nothing to move). */
export interface HistoryStep<T> {
  readonly history: History<T>;
  readonly value: T;
}

/** A fresh History with nothing to undo or redo - the starting point before
 * any push, and also what a Load-triggered reset (spec: "Load resets
 * history") replaces the current History with. */
export function createHistory<T>(): History<T> {
  return { past: [], future: [] };
}

/**
 * Records `snapshot` (the pre-change value, per the spec's Implementation
 * Decisions) as the new most-recent past entry, and clears future - the
 * standard undo/redo rule that taking a new action after an undo abandons
 * whatever redo path was available.
 */
export function push<T>(history: History<T>, snapshot: T): History<T> {
  return { past: [...history.past, snapshot], future: [] };
}

/**
 * Steps one entry back: `current` is set aside onto future, and the most
 * recent past entry becomes the returned value. A no-op (same History,
 * `current` echoed back unchanged) when past is empty.
 */
export function undo<T>(history: History<T>, current: T): HistoryStep<T> {
  if (history.past.length === 0) return { history, value: current };

  const value = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);
  return { history: { past, future: [...history.future, current] }, value };
}

/**
 * Steps one entry forward: the mirror of {@link undo}. `current` is set
 * aside onto past, and the most recent future entry becomes the returned
 * value. A no-op when future is empty.
 */
export function redo<T>(history: History<T>, current: T): HistoryStep<T> {
  if (history.future.length === 0) return { history, value: current };

  const value = history.future[history.future.length - 1];
  const future = history.future.slice(0, -1);
  return { history: { past: [...history.past, current], future }, value };
}

/** Empties both stacks - e.g. on Load (spec: a new document isn't an edit to
 * undo back out of). Equivalent to {@link createHistory}, named separately
 * for the call site's intent ("clear the existing history" vs. "make a
 * fresh one"). */
export function clear<T>(): History<T> {
  return createHistory();
}
