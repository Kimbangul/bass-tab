import { describe, expect, it } from "vitest";
import { computePageRegions, pageFittingHeights } from "./exportJpg";

describe("pageFittingHeights", () => {
  it("uses the gap to the next system's start, not the system's own height", () => {
    const systemBounds = [
      { y: 0, h: 10 },
      { y: 15, h: 10 },
      { y: 30, h: 8 },
    ];

    expect(pageFittingHeights(systemBounds)).toEqual([15, 15, 8]);
  });

  it("uses the last system's own height, since there's no next system to measure a gap to", () => {
    expect(pageFittingHeights([{ y: 100, h: 20 }])).toEqual([20]);
  });
});

describe("computePageRegions", () => {
  it("returns one region per page, spanning from the first to the last system's bounds", () => {
    const systemBounds = [
      { y: 0, h: 100 },
      { y: 100, h: 120 },
      { y: 220, h: 90 },
    ];

    expect(computePageRegions(systemBounds, [[0, 1], [2]])).toEqual([
      { top: 0, height: 220 },
      { top: 220, height: 90 },
    ]);
  });

  it("returns a region matching a single system when a page holds only one", () => {
    const systemBounds = [{ y: 50, h: 30 }];

    expect(computePageRegions(systemBounds, [[0]])).toEqual([{ top: 50, height: 30 }]);
  });

  it("returns no regions when there are no pages", () => {
    expect(computePageRegions([], [])).toEqual([]);
  });
});
