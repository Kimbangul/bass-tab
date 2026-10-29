import { DURATIONS_LARGEST_FIRST } from "../domain/editing";
import type { Duration, Measure, StringNumber } from "../domain/project";

const STRINGS: StringNumber[] = [1, 2, 3, 4];
const DURATION_LABELS: Record<Duration, string> = {
  whole: "1/1",
  half: "1/2",
  quarter: "1/4",
  eighth: "1/8",
  sixteenth: "1/16",
};

interface Props {
  measure: Measure;
  /** The cursor's column and string, when the cursor is in this Measure. */
  cursor: { column: number; string: StringNumber } | null;
  /** Fret digits typed at the cursor but not yet confirmed. */
  digits: string;
  onSelect: (column: number, string: StringNumber) => void;
  onChangeDuration: (column: number, duration: Duration) => void;
}

/**
 * One Measure as a sequence of columns (ADR-0006): one column per Note or
 * Rest whatever its duration, plus an append column (+) at the end. A
 * duration label heads each column; a Note shows its fret on its own
 * string's row, a Rest one mark across all four rows.
 *
 * Purely presentational - keystrokes are handled by the surrounding editor
 * (App) through the entry reducer; this only reports clicks.
 */
export function MeasureGrid({ measure, cursor, digits, onSelect, onChangeDuration }: Props) {
  const columnCount = measure.slots.length + 1;
  const selectedSlot = cursor ? measure.slots[cursor.column] : undefined;
  const selectedNote = cursor && selectedSlot?.kind === "note" ? { column: cursor.column, slot: selectedSlot } : null;

  return (
    <>
      {selectedNote && (
        <div className="duration-toolbar">
          {DURATIONS_LARGEST_FIRST.map((duration) => (
            <button
              key={duration}
              type="button"
              tabIndex={-1}
              className={duration === selectedNote.slot.duration ? "active" : ""}
              // Keeps keyboard focus on the editor, so clicking the toolbar
              // doesn't read as leaving the entry.
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => {
                if (duration !== selectedNote.slot.duration) onChangeDuration(selectedNote.column, duration);
              }}
            >
              {DURATION_LABELS[duration]}
            </button>
          ))}
        </div>
      )}
      <div className="measure-grid" style={{ gridTemplateColumns: `repeat(${columnCount}, 2rem)` }}>
        {Array.from({ length: columnCount }, (_, column) => {
          const slot = measure.slots[column];
          const gridColumn = column + 1;
          return [
            <div key={`h-${column}`} className="measure-grid-header" style={{ gridColumn, gridRow: 1 }}>
              {slot ? DURATION_LABELS[slot.duration] : "+"}
            </div>,
            ...STRINGS.map((string) => {
              const isCursor = cursor?.column === column && cursor.string === string;
              const fret = slot?.kind === "note" && slot.string === string ? slot.fret : null;
              return (
                <div
                  key={`${string}-${column}`}
                  className={`measure-grid-cell${isCursor ? " selected" : ""}${slot ? "" : " append"}`}
                  style={{ gridColumn, gridRow: string + 1 }}
                  onClick={() => onSelect(column, string)}
                >
                  {isCursor && digits !== "" ? digits : fret}
                </div>
              );
            }),
            // Hidden while a fret is being typed over the Rest, so the digits stay readable.
            slot?.kind === "rest" && !(cursor?.column === column && digits !== "") && (
              <div key={`r-${column}`} className="measure-grid-rest" style={{ gridColumn, gridRow: "2 / 6" }}>
                𝄽
              </div>
            ),
          ];
        })}
      </div>
    </>
  );
}
