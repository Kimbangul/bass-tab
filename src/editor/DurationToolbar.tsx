import { DURATIONS_LARGEST_FIRST } from "../domain/editing";
import type { Duration } from "../domain/project";
import { DURATION_LABELS } from "./durationLabels";

interface Props {
  /** The selected Note's or Rest's duration; null disables the toolbar. */
  selected: Duration | null;
  onPick: (duration: Duration) => void;
}

/**
 * The one duration toolbar above all Measures. It is always rendered and
 * sticks to the top of the viewport, so selecting or leaving a column never
 * shifts the layout (spec .scratch/sequence-editing, ticket 08). It is
 * disabled when nothing it could act on is selected.
 */
export function DurationToolbar({ selected, onPick }: Props) {
  return (
    <div className="duration-toolbar" aria-label="Duration">
      {DURATIONS_LARGEST_FIRST.map((duration) => (
        <button
          key={duration}
          type="button"
          tabIndex={-1}
          disabled={selected === null}
          className={duration === selected ? "active" : ""}
          // Keeps keyboard focus on the editor, so clicking the toolbar
          // doesn't read as leaving the entry.
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onClick={() => {
            if (selected !== null && duration !== selected) onPick(duration);
          }}
        >
          {DURATION_LABELS[duration]}
        </button>
      ))}
    </div>
  );
}
