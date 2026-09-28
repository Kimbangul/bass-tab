import { useRef, useState } from "react";
import { tickRangesOf, type TickRange } from "../domain/editing";
import type { Measure, StringNumber } from "../domain/project";

const TICKS_PER_MEASURE = 16;
const STRINGS: StringNumber[] = [1, 2, 3, 4];

interface Props {
  measure: Measure;
  onPlaceNote: (tick: number, string: StringNumber, fret: number) => void;
}

/**
 * One Measure as a 4-string x 16-tick clickable grid (ADR-0004: overwrite
 * model). Clicking a cell that's currently a Rest opens an inline fret
 * entry; clicking a cell that already holds a Note is a no-op here -
 * selecting/overwriting an existing Note is ticket 02, not this one.
 */
export function MeasureGrid({ measure, onPlaceNote }: Props) {
  const ranges = tickRangesOf(measure);
  const [editingCell, setEditingCell] = useState<{ string: StringNumber; tick: number } | null>(null);
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

  function handleCellClick(string: StringNumber, tick: number) {
    const slot = rangeAtTick(tick)?.slot;
    if (slot?.kind === "note" && slot.string === string) return; // ticket 02
    confirmedRef.current = false;
    setEditingCell({ string, tick });
    setInputValue("");
  }

  return (
    <div className="measure-grid" style={{ gridTemplateColumns: `repeat(${TICKS_PER_MEASURE}, 2rem)` }}>
      {STRINGS.map((string) =>
        Array.from({ length: TICKS_PER_MEASURE }, (_, tick) => {
          const range = rangeAtTick(tick);
          const isEditing = editingCell?.string === string && editingCell.tick === tick;
          const fret =
            range?.slot.kind === "note" && range.slot.string === string && range.start === tick
              ? range.slot.fret
              : null;

          return (
            <div key={`${string}-${tick}`} className="measure-grid-cell" onClick={() => handleCellClick(string, tick)}>
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
