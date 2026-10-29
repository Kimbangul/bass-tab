import { DURATIONS_LARGEST_FIRST } from "../domain/editing";
import type { Duration, Measure, MeasureSlot, StringNumber } from "../domain/project";

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
  /** A new, still-empty column is open before the cursor's column (`I`/Insert). */
  inserting: boolean;
  /** `pending`: the click was on the pending inserted column itself. */
  onSelect: (column: number, string: StringNumber, pending: boolean) => void;
  onChangeDuration: (column: number, duration: Duration) => void;
}

/** One rendered column: a slot, the append column (no slot), or the pending
 * inserted column, each with the Measure column index a click on it selects. */
interface DisplayColumn {
  column: number;
  slot?: MeasureSlot;
  pending?: true;
}

function displayColumns(measure: Measure, pendingAt: number | null): DisplayColumn[] {
  const columns: DisplayColumn[] = [];
  for (let column = 0; column <= measure.slots.length; column++) {
    if (column === pendingAt) columns.push({ column, pending: true });
    columns.push({ column, slot: measure.slots[column] });
  }
  return columns;
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
export function MeasureGrid({ measure, cursor, digits, inserting, onSelect, onChangeDuration }: Props) {
  const columns = displayColumns(measure, inserting && cursor ? cursor.column : null);
  const columnCount = columns.length;
  const selectedSlot = cursor && !inserting ? measure.slots[cursor.column] : undefined;
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
        {columns.map(({ column, slot, pending }, index) => {
          const gridColumn = index + 1;
          // While a column is pending insertion, the cursor is on it rather
          // than on the existing column it was opened before.
          const isCursorColumn = cursor?.column === column && inserting === Boolean(pending);
          const key = pending ? "pending" : column;
          return [
            <div key={`h-${key}`} className="measure-grid-header" style={{ gridColumn, gridRow: 1 }}>
              {slot ? DURATION_LABELS[slot.duration] : pending ? "" : "+"}
            </div>,
            ...STRINGS.map((string) => {
              const isCursor = isCursorColumn && cursor?.string === string;
              const fret = slot?.kind === "note" && slot.string === string ? slot.fret : null;
              return (
                <div
                  key={`${string}-${key}`}
                  className={`measure-grid-cell${isCursor ? " selected" : ""}${slot || pending ? "" : " append"}`}
                  style={{ gridColumn, gridRow: string + 1 }}
                  onClick={() => onSelect(column, string, Boolean(pending))}
                >
                  {isCursor && digits !== "" ? digits : fret}
                </div>
              );
            }),
            // Hidden while a fret is being typed over the Rest, so the digits stay readable.
            slot?.kind === "rest" && !(isCursorColumn && digits !== "") && (
              <div key={`r-${key}`} className="measure-grid-rest" style={{ gridColumn, gridRow: "2 / 6" }}>
                𝄽
              </div>
            ),
          ];
        })}
      </div>
    </>
  );
}
