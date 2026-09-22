// Domain model for a bass tab Project. See CONTEXT.md for the vocabulary these
// types implement (Project, Measure, Note, Tuning). Kept free of any
// rendering-library detail — see src/rendering/projectToScore.ts for the
// AlphaTab adapter (ADR-0002).

/**
 * A string's position within a Measure's tab, numbered the way tab is read:
 * 1 is the highest-pitched (topmost) string, 4 the lowest (bottommost).
 */
export type StringNumber = 1 | 2 | 3 | 4;

export type Duration = "whole" | "half" | "quarter" | "eighth" | "sixteenth";

export interface Note {
  kind: "note";
  string: StringNumber;
  /** 0 = open string. */
  fret: number;
  duration: Duration;
}

export interface Rest {
  kind: "rest";
  duration: Duration;
}

/** One time-ordered position within a Measure: either a played Note or a Rest. */
export type MeasureSlot = Note | Rest;

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface Measure {
  timeSignature: TimeSignature;
  slots: MeasureSlot[];
}

/** MIDI note numbers for strings 1..4 (highest to lowest), standard 4-string bass. */
export const STANDARD_BASS_TUNING: readonly [number, number, number, number] = [43, 38, 33, 28];

export interface Project {
  title: string;
  tuning: readonly [number, number, number, number];
  measures: Measure[];
}
