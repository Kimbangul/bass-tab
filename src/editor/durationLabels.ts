import type { Duration } from "../domain/project";

/** How a Duration is written in the grid's column headers and the toolbar. */
export const DURATION_LABELS: Record<Duration, string> = {
  whole: "1/1",
  half: "1/2",
  quarter: "1/4",
  eighth: "1/8",
  sixteenth: "1/16",
};
