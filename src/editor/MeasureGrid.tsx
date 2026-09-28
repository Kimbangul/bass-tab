import { useRef, useState } from "react";
import { tickRangesOf, type TickRange } from "../domain/editing";
import type { Measure, StringNumber } from "../domain/project";

const TICKS_PER_MEASURE = 16;
const STRINGS: StringNumber[] = [1, 2, 3, 4];

interface Cell {
  string: StringNumber;
  tick: number;
}

interface Props {
  measure: Measure;
  onPlaceNote: (tick: number, string: StringNumber, fret: number) => void;
}

function sameCell(a: Cell | null, b: Cell): boolean {
  return a !== null && a.string === b.string && a.tick === b.tick;
}

/**
 * One Measure as a 4-string x 16-tick clickable grid (ADR-0004: overwrite
 * model). Clicking any cell - Rest or Note - selects it and opens an empty
 * inline fret entry there; typing digits and pressing Enter (or clicking
 * elsewhere) confirms and overwrites whatever was at that position through
 * `placeNoteAt`. An empty confirm (nothing typed) leaves the cell as it
 * was. Selecting a different cell moves the selection - only one cell is
 * ever being edited at a time.
 */
export function MeasureGrid({ measure, onPlaceNote }: Props) {
  const ranges = tickRangesOf(measure);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);
  const [inputValue, setInputValue] = useState("");
  // Enter and the blur it can trigger (when React removes the still-focused
  // input on the resulting re-render) can both reach confirmEntry for the
  // same entry; this guards against acting on it twice.
  const confirmedRef = useRef(false);

  function rangeAtTick(tick: number): TickRange | undefined {
    return ranges.find((r) => r.start <= tick && tick < r.end);
  }

  function confirmEntry() {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    if (editingCell) {
      const fret = Number.parseInt(inputValue, 10);
      if (Number.isInteger(fret) && fret >= 0) {
        onPlaceNote(editingCell.tick, editingCell.string, fret);
      }
    }
    setEditingCell(null);
    setInputValue("");
  }

  function handleCellClick(cell: Cell) {
    const range = rangeAtTick(cell.tick);
    // Clicking anywhere in an existing Note's own span (not just its first
    // tick, e.g. the second tick of a default eighth-note) must edit that
    // Note at its actual start - not fragment it at the clicked sub-tick.
    // A click on a different string at that same tick is a new Note there
    // instead (ADR-0004 overwrite), so it keeps the exact tick clicked.
    const target: Cell =
      range?.slot.kind === "note" && range.slot.string === cell.string
        ? { string: cell.string, tick: range.start }
        : cell;

    confirmedRef.current = false;
    setEditingCell(target);
    setInputValue("");
  }

  return (
    <div className="measure-grid" style={{ gridTemplateColumns: `repeat(${TICKS_PER_MEASURE}, 2rem)` }}>
      {STRINGS.map((string) =>
        Array.from({ length: TICKS_PER_MEASURE }, (_, tick) => {
          const cell: Cell = { string, tick };
          const range = rangeAtTick(tick);
          const isEditing = sameCell(editingCell, cell);
          const fret =
            range?.slot.kind === "note" && range.slot.string === string && range.start === tick
              ? range.slot.fret
              : null;

          return (
            <div
              key={`${string}-${tick}`}
              className={`measure-grid-cell${isEditing ? " selected" : ""}`}
              onClick={() => handleCellClick(cell)}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ""))}
                  onBlur={confirmEntry}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEntry();
                  }}
                />
              ) : (
                fret
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
