import { describe, expect, it } from "vitest";
import { splitSystemsIntoPages } from "./pageSplitting";

describe("splitSystemsIntoPages", () => {
  it("puts every system on one page when they all fit within the max height", () => {
    const result = splitSystemsIntoPages([100, 100, 100], 500);

    expect(result).toEqual([[0, 1, 2]]);
  });

  it("starts a new page once the next system would exceed the max height", () => {
    // 100+100+100 = 300 fits under 350, but a 4th 100 would make 400 > 350.
    const result = splitSystemsIntoPages([100, 100, 100, 100, 100], 350);

    expect(result).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);
  });

  it("keeps a system on the current page when it lands exactly on maxPageHeight", () => {
    // 100+100+100 == 300, exactly maxPageHeight - should NOT start a new page.
    const result = splitSystemsIntoPages([100, 100, 100], 300);

    expect(result).toEqual([[0, 1, 2]]);
  });

  it("gives an oversized system its own page instead of dropping or merging it", () => {
    const result = splitSystemsIntoPages([500, 50], 100);

    expect(result).toEqual([[0], [1]]);
  });

  it("preserves system order and returns no pages for an empty input", () => {
    expect(splitSystemsIntoPages([], 500)).toEqual([]);
  });
});
