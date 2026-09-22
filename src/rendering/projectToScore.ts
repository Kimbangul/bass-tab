import { model, Settings } from "@coderline/alphatab";
import type { Duration, Measure, Project, StringNumber } from "../domain/project";

const DURATION_TO_ALPHATAB: Record<Duration, model.Duration> = {
  whole: model.Duration.Whole,
  half: model.Duration.Half,
  quarter: model.Duration.Quarter,
  eighth: model.Duration.Eighth,
  sixteenth: model.Duration.Sixteenth,
};

/**
 * Our strings are numbered top-of-tab-first (1 = highest-pitched); AlphaTab
 * numbers them bottom-up (1 = lowest-pitched). Flip across the string count.
 */
function toAlphaTabString(ourString: StringNumber, stringCount: number): number {
  return stringCount + 1 - ourString;
}

/**
 * Converts a Project into an AlphaTab Score for rendering only (ADR-0002).
 * The Project remains the source of truth; nothing here is read back.
 */
export function projectToScore(project: Project): model.Score {
  const score = new model.Score();
  score.title = project.title;

  const track = new model.Track();
  const staff = new model.Staff();
  staff.stringTuning = new model.Tuning(undefined, [...project.tuning]);
  staff.showTablature = true;
  staff.showStandardNotation = false;
  track.addStaff(staff);

  score.addTrack(track);

  const stringCount = project.tuning.length;

  for (const measure of project.measures) {
    const masterBar = new model.MasterBar();
    masterBar.timeSignatureNumerator = measure.timeSignature.numerator;
    masterBar.timeSignatureDenominator = measure.timeSignature.denominator;
    score.addMasterBar(masterBar);

    staff.addBar(buildBar(measure, stringCount));
  }

  // AlphaTab's own importers all call this after building a Score by hand;
  // it populates the derived fields (beat min/max note, beaming, ...) the
  // renderer reads. Skipping it leaves the score unrenderable.
  score.finish(new Settings());

  return score;
}

function buildBar(measure: Measure, stringCount: number): model.Bar {
  const bar = new model.Bar();
  const voice = new model.Voice();

  for (const slot of measure.slots) {
    const beat = new model.Beat();
    beat.duration = DURATION_TO_ALPHATAB[slot.duration];

    if (slot.kind === "note") {
      const note = new model.Note();
      note.fret = slot.fret;
      note.string = toAlphaTabString(slot.string, stringCount);
      beat.addNote(note);
    } else {
      beat.isEmpty = true;
    }

    voice.addBeat(beat);
  }

  bar.addVoice(voice);
  return bar;
}
