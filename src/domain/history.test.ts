import { describe, expect, it } from "vitest";
import { clear, createHistory, push, redo, undo } from "./history";
import type { History } from "./history";

describe("push + undo", () => {
  it("undo after a push returns the prior value", () => {
    const history = push(createHistory<string>(), "first");

    const result = undo(history, "second");

    expect(result.value).toBe("first");
  });

  it("moves the value undone away from onto future, so redo can reach it", () => {
    const history = push(createHistory<string>(), "first");

    const { history: afterUndo } = undo(history, "second");

    expect(afterUndo.future).toEqual(["second"]);
    expect(afterUndo.past).toEqual([]);
  });
});

describe("undo", () => {
  it("is a no-op when past is empty", () => {
    const history = createHistory<string>();

    const result = undo(history, "current");

    expect(result.value).toBe("current");
    expect(result.history).toEqual(history);
  });
});

describe("redo", () => {
  it("after an undo returns you forward again", () => {
    const history = push(createHistory<string>(), "first");
    const { history: afterUndo, value: undone } = undo(history, "second");

    const { history: afterRedo, value: redone } = redo(afterUndo, undone);

    expect(redone).toBe("second");
    expect(afterRedo.past).toEqual(["first"]);
    expect(afterRedo.future).toEqual([]);
  });

  it("is a no-op when future is empty", () => {
    const history = createHistory<string>();

    const result = redo(history, "current");

    expect(result.value).toBe("current");
    expect(result.history).toEqual(history);
  });
});

describe("push after undo", () => {
  it("clears the future stack, so redo no longer works until the next undo", () => {
    const history = push(createHistory<string>(), "first");
    const { history: afterUndo, value: current } = undo(history, "second");

    // A new confirmed edit happens after undoing - "second" is abandoned,
    // and the pre-change value ("first", now back as current) is pushed.
    const afterNewPush = push(afterUndo, current);

    expect(afterNewPush.future).toEqual([]);

    const redoResult = redo(afterNewPush, "third");
    expect(redoResult.value).toBe("third");
    expect(redoResult.history).toEqual(afterNewPush);
  });
});

describe("clear", () => {
  it("empties both stacks", () => {
    const history = push(createHistory<string>(), "first");
    const { history: withFuture } = undo(history, "second");
    expect(withFuture.past.length + withFuture.future.length).toBeGreaterThan(0);

    const cleared = clear<string>();

    expect(cleared.past).toEqual([]);
    expect(cleared.future).toEqual([]);
  });
});

describe("generic snapshot type", () => {
  it("works over plain objects, not just primitives", () => {
    interface Snapshot {
      title: string;
      count: number;
    }

    const history = push(createHistory<Snapshot>(), { title: "a", count: 1 });

    const result = undo(history, { title: "b", count: 2 });

    expect(result.value).toEqual({ title: "a", count: 1 });
  });
});

// Type-only usage to make sure History<T> is exported and usable by callers
// (e.g. App.tsx state) without needing a value import.
const _typeCheck: History<number> = createHistory<number>();
void _typeCheck;
