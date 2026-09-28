import { useRef, useState } from "react";
import { DURATIONS_LARGEST_FIRST, tickRangesOf, type TickRange } from "../domain/editing";
import type { Duration, Measure, Note, StringNumber } from "../domain/project";

const TICKS_PER_MEASURE = 16;
const STRINGS: StringNumber[] = [1, 2, 3, 4];
const DURATION_LABELS: Record<Duration, string> = {
  whole: "1/1",
  half: "1/2",
  quarter: "1/4",
  eighth: "1/8",
  sixteenth: "1/16",
};

interface Cell {
  string: StringNumber;
  tick: number;
}

interface Props {
  measure: Measure;
  onPlaceNote: (tick: number, string: StringNumber, fret: number) => void;
  onPlaceRest: (tick: number) => void;
  onChangeDuration: (tick: number, duration: Duration) => void;
  onDeleteNote: (tick: number) => void;
}

function sameCell(a: Cell | null, b: Cell): boolean {
  return a !== null && a.string === b.string && a.tick === b.tick;
}

type CellNoteRelation =
  | { kind: "start"; note: Note } // this cell is where the Note begins - shows its fret, is its selection target
  | { kind: "continuation" } // a later tick of that same Note, on its own string - disabled (see MeasureGrid's docs)
  | { kind: "none" }; // a Rest, or a Note on a different string - an ordinary clickable cell

/** How `cell` relates to whatever Note occupies its string at that tick, if
 * any - the one shared classification behind both "does this cell show a
 * fret / is it the duration toolbar's target" and "is this cell disabled as
 * a Note's own continuation," so the two can't drift apart on what counts as
 * a Note's start. */
function cellNoteRelation(range: TickRange | undefined, cell: Cell): CellNoteRelation {
  if (range?.slot.kind !== "note" || range.slot.string !== cell.string) return { kind: "none" };
  return range.start === cell.tick ? { kind: "start", note: range.slot } : { kind: "continuation" };
}

/**
 * One Measure as a 4-string x 16-tick clickable grid (ADR-0004: overwrite
 * model). The default Note duration is one tick (sixteenth), so a click
 * always means "a new, independent Note here" - never "guess which existing
 * Note this belongs to." A Note widened past one tick (via the duration
 * toolbar below) disables the cells for its later ticks on its own string
 * (grayed out, unclickable) so they're never mistaken for empty ones; a
 * different string at those same ticks is still a legitimate target for its
 * own Note (ADR-0004 overwrite).
 *
 * Clicking any enabled cell - Rest or Note - selects it and opens an empty
 * inline fret entry there. From there:
 * - Digits + Enter (or clicking elsewhere) overwrite whatever was at that
 *   position with a Note, through `placeNoteAt`. An empty confirm (nothing
 *   typed) leaves the cell as it was.
 * - Space places a Rest instead, through `placeRestAt` - only on an empty
 *   cell; a no-op on a selected Note (see ticket 05 for deleting one).
 * - On a selected Note, a duration-icon toolbar also appears
 *   (`changeDuration`), and Backspace/Delete (once the input is empty)
 *   replaces it with a Rest of its own duration (`deleteNoteAt`) rather
 *   than editing the fret entry's text.
 * Selecting a different cell moves the selection - only one cell is ever
 * being edited at a time.
 */
export function MeasureGrid({ measure, onPlaceNote, onPlaceRest, onChangeDuration, onDeleteNote }: Props) {
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

  // The Note currently selected/edited, if editingCell points at one -
  // drives whether the duration toolbar shows (ticket 03) and whether Space
  // is allowed to place a Rest (ticket 04 only targets empty cells; an
  // existing Note is deleted via Backspace/Delete instead - ticket 05).
  const selectedNote = (() => {
    if (!editingCell) return null;
    const relation = cellNoteRelation(rangeAtTick(editingCell.tick), editingCell);
    return relation.kind === "start" ? { cell: editingCell, duration: relation.note.duration } : null;
  })();

  // Shared close-the-entry plumbing for confirmEntry and confirmRest below:
  // guard against running twice (Enter, then the blur it can trigger when
  // React removes the still-focused input on the resulting re-render), run
  // `action` against the cell being edited, then reset local state.
  function confirm(action: (cell: Cell) => void) {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    if (editingCell) action(editingCell);
    setEditingCell(null);
    setInputValue("");
  }

  function confirmEntry() {
    confirm((cell) => {
      const fret = Number.parseInt(inputValue, 10);
      if (Number.isInteger(fret) && fret >= 0) {
        onPlaceNote(cell.tick, cell.string, fret);
      }
    });
  }

  // Space, instead of a fret digit, places a Rest at the targeted cell -
  // only when it's targeting an empty cell (ticket 04); on an existing
  // Note it's a no-op, since overwriting it with a default-duration Rest
  // would silently destroy its fret and real duration.
  function confirmRest() {
    if (selectedNote) return;
    confirm((cell) => onPlaceRest(cell.tick));
  }

  // Backspace/Delete replaces the selected Note with a Rest of its own
  // duration (ticket 05) - only meaningful when a Note is actually
  // selected; on an empty cell there's nothing to delete.
  function confirmDelete() {
    if (!selectedNote) return;
    confirm((cell) => onDeleteNote(cell.tick));
  }

  // A later tick of the clicked cell's own Note is disabled in the render
  // loop below and never reaches this handler, so `cell` is always either a
  // Note's own start (editing it) or free for a new Note - on this string or
  // a different one at that tick (ADR-0004 overwrite) - never a sub-tick
  // that needs redirecting to some other position.
  function handleCellClick(cell: Cell) {
    confirmedRef.current = false;
    setEditingCell(cell);
    setInputValue("");
  }

  return (
    <>
      {selectedNote && (
        <div className="duration-toolbar">
          {DURATIONS_LARGEST_FIRST.map((duration) => (
            <button
              key={duration}
              type="button"
              className={duration === selectedNote.duration ? "active" : ""}
              // Without these, mousedown (or touchstart, on a touchscreen)
              // blurs the still-focused fret input first; that blur's
              // confirmEntry() clears editingCell (selectedNote), unmounting
              // this toolbar - button included - before the click ever
              // reaches it, so onChangeDuration never fires. Keeping focus
              // on the input lets the click land either way.
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => {
                if (duration !== selectedNote.duration) {
                  onChangeDuration(selectedNote.cell.tick, duration);
                }
              }}
            >
              {DURATION_LABELS[duration]}
            </button>
          ))}
        </div>
      )}
      <div className="measure-grid" style={{ gridTemplateColumns: `repeat(${TICKS_PER_MEASURE}, 2rem)` }}>
        {STRINGS.map((string) =>
          Array.from({ length: TICKS_PER_MEASURE }, (_, tick) => {
            const cell: Cell = { string, tick };
            const relation = cellNoteRelation(rangeAtTick(tick), cell);
            const isEditing = sameCell(editingCell, cell);
            const isDisabled = relation.kind === "continuation";
            const fret = relation.kind === "start" ? relation.note.fret : null;

            return (
              <div
                key={`${string}-${tick}`}
                className={`measure-grid-cell${isEditing ? " selected" : ""}${isDisabled ? " disabled" : ""}`}
                onClick={isDisabled ? undefined : () => handleCellClick(cell)}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ""))}
                    onBlur={confirmEntry}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEntry();
                      if (e.key === " ") {
                        e.preventDefault();
                        confirmRest();
                      }
                      // Only once the input is empty - otherwise Backspace
                      // edits a fret digit the user is retyping, same as
                      // any normal text field.
                      if ((e.key === "Backspace" || e.key === "Delete") && inputValue === "") {
                        e.preventDefault();
                        confirmDelete();
                      }
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
    </>
  );
}
