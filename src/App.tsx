import { AlphaTabApi } from "@coderline/alphatab";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  addMeasure,
  changeDuration,
  createEmptyMeasure,
  DEFAULT_NOTE_DURATION,
  DEFAULT_REST_DURATION,
  deleteNoteAt,
  placeNoteAt,
  placeRestAt,
} from "./domain/editing";
import { createHistory, push, redo, undo, type History } from "./domain/history";
import type { Duration, Project, StringNumber, TimeSignature } from "./domain/project";
import { STANDARD_BASS_TUNING } from "./domain/project";
import { MeasureGrid } from "./editor/MeasureGrid";
import { exportJpg } from "./export/exportJpg";
import { loadProjectFromIndexedDB, saveProjectToIndexedDB } from "./persistence/autosave";
import { parseSavedProject } from "./persistence/parseSavedProject";
import { projectToScore } from "./rendering/projectToScore";

const AUTOSAVE_DEBOUNCE_MS = 500;

// Denominators that evenly divide the grid's sixteenth-note tick resolution
// (ticksPerMeasure in domain/editing.ts) - any other denominator would need a
// finer tick unit than the app supports.
const TIME_SIGNATURE_DENOMINATORS = [2, 4, 8, 16] as const;
const MAX_TIME_SIGNATURE_NUMERATOR = 32;
const DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };

// Windows/macOS/Linux all reject a subset of these in filenames; replacing
// them (rather than leaving it to the browser/OS to silently mangle or
// reject the download) keeps Save's filename predictable.
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[/\\:*?"<>|]/g, "_").trim();
  return cleaned || "Untitled";
}

function createEmptyProject(): Project {
  return {
    title: "Untitled",
    tuning: STANDARD_BASS_TUNING,
    measures: [createEmptyMeasure()],
  };
}

function App() {
  const elementRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);
  // Title editing has no Enter/blur "confirm" step like a grid cell does - it
  // commits every keystroke live. Without this, each keystroke would push its
  // own history entry, making undo nearly useless for typing a title. Pushed
  // once per continuous typing session (reset on blur), so undo treats "type
  // a whole title" as one step, matching the fret-entry input's granularity.
  const titleHistoryPushedRef = useRef(false);
  const [project, setProject] = useState<Project>(createEmptyProject);
  // The time signature the next "+ Add measure" click will use - starts at
  // 4/4 and remembers the last pick, so adding several measures of the same
  // non-default signature in a row doesn't mean reselecting it every time.
  const [nextTimeSignature, setNextTimeSignature] = useState<TimeSignature>(DEFAULT_TIME_SIGNATURE);
  const [history, setHistory] = useState<History<Project>>(createHistory);
  // Gates auto-save until the restore attempt below finishes - otherwise the
  // initial empty Project could get auto-saved first and overwrite a real
  // one before it's ever read back.
  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadProjectFromIndexedDB().then((restored) => {
      if (cancelled) return;
      if (restored) setProject(restored);
      setHasRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasRestored) return;
    const timeout = setTimeout(() => {
      saveProjectToIndexedDB(project);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [project, hasRestored]);

  useEffect(() => {
    const api = new AlphaTabApi(elementRef.current!, {
      core: {
        fontDirectory: "/font/",
      },
      player: {
        enablePlayer: false,
      },
    });
    apiRef.current = api;

    return () => {
      apiRef.current = null;
      api.destroy();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.renderScore(projectToScore(project));
  }, [project]);

  // Ctrl+Z / Ctrl+Shift+Z undo/redo, ignored while any text input has focus
  // (the MeasureGrid fret-entry input's own Backspace/Delete handling, and a
  // text input's native browser undo, both take priority over the app-wide
  // shortcut instead of fighting it).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || e.key.toLowerCase() !== "z") return;
      if (document.activeElement?.tagName === "INPUT") return;
      e.preventDefault();
      // Same two-step "apply the step" body as handleUndo/handleRedo below,
      // inlined rather than calling them - referencing those (recreated every
      // render) here would need useCallback to satisfy exhaustive-deps, which
      // is more machinery than this tiny duplication is worth.
      const step = e.shiftKey ? redo(history, project) : undo(history, project);
      setHistory(step.history);
      setProject(step.value);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, project]);

  // Every action below that mutates `project` pushes the pre-change value
  // onto the undo history first - `project` here is this render's value,
  // captured before `setProject` schedules the actual change, so it's always
  // the correct "what to go back to" snapshot.
  function pushHistory() {
    setHistory((h) => push(h, project));
  }

  function handleUndo() {
    const step = undo(history, project);
    setHistory(step.history);
    setProject(step.value);
  }

  function handleRedo() {
    const step = redo(history, project);
    setHistory(step.history);
    setProject(step.value);
  }

  function handlePlaceNote(measureIndex: number, tick: number, string: StringNumber, fret: number) {
    pushHistory();
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = placeNoteAt(measures[measureIndex], tick, {
        kind: "note",
        string,
        fret,
        duration: DEFAULT_NOTE_DURATION,
      });
      return { ...prev, measures };
    });
  }

  function handlePlaceRest(measureIndex: number, tick: number) {
    pushHistory();
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = placeRestAt(measures[measureIndex], tick, DEFAULT_REST_DURATION);
      return { ...prev, measures };
    });
  }

  function handleChangeDuration(measureIndex: number, tick: number, duration: Duration) {
    pushHistory();
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = changeDuration(measures[measureIndex], tick, duration);
      return { ...prev, measures };
    });
  }

  function handleDeleteNote(measureIndex: number, tick: number) {
    pushHistory();
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = deleteNoteAt(measures[measureIndex], tick);
      return { ...prev, measures };
    });
  }

  function handleAddMeasure() {
    pushHistory();
    setProject((prev) => addMeasure(prev, nextTimeSignature));
  }

  function handleChangeTitle(title: string) {
    if (!titleHistoryPushedRef.current) {
      pushHistory();
      titleHistoryPushedRef.current = true;
    }
    setProject((prev) => ({ ...prev, title }));
  }

  function handleExportPdf() {
    // AlphaTab's own print flow (ADR-0005) - opens a print-optimized popup;
    // the user finishes the export via their browser's print dialog (e.g.
    // "Save as PDF"). No canvas capture or page-break logic of our own.
    apiRef.current?.print();
  }

  function handleExportJpg() {
    const api = apiRef.current;
    const container = elementRef.current;
    if (!api || !container) return;
    exportJpg(api, container, sanitizeFilename(project.title)).catch(() => {
      window.alert("JPG로 내보내지 못했습니다.");
    });
  }

  function handleSave() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(project.title)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleLoadFile(file: File) {
    if (!window.confirm("현재 작업 중인 내용이 사라집니다. 불러올까요?")) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        setProject(parseSavedProject(String(reader.result)));
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "파일을 불러오지 못했습니다.");
      }
    };
    reader.onerror = () => {
      window.alert("파일을 읽지 못했습니다.");
    };
    reader.readAsText(file);
  }

  return (
    <>
      <h1>Bass Tab Editor</h1>
      <input
        className="project-title"
        value={project.title}
        onChange={(e) => handleChangeTitle(e.target.value)}
        onBlur={() => {
          titleHistoryPushedRef.current = false;
        }}
        aria-label="Project title"
      />
      <button type="button" onClick={handleUndo} disabled={history.past.length === 0}>
        Undo
      </button>
      <button type="button" onClick={handleRedo} disabled={history.future.length === 0}>
        Redo
      </button>
      {project.measures.map((measure, index) => (
        <MeasureGrid
          key={index}
          measure={measure}
          onPlaceNote={(tick, string, fret) => handlePlaceNote(index, tick, string, fret)}
          onPlaceRest={(tick) => handlePlaceRest(index, tick)}
          onChangeDuration={(tick, duration) => handleChangeDuration(index, tick, duration)}
          onDeleteNote={(tick) => handleDeleteNote(index, tick)}
        />
      ))}
      <span className="time-signature-picker">
        <select
          aria-label="New measure's time signature numerator"
          value={nextTimeSignature.numerator}
          onChange={(e) =>
            setNextTimeSignature((prev) => ({ ...prev, numerator: Number(e.target.value) }))
          }
        >
          {Array.from({ length: MAX_TIME_SIGNATURE_NUMERATOR }, (_, i) => i + 1).map((numerator) => (
            <option key={numerator} value={numerator}>
              {numerator}
            </option>
          ))}
        </select>
        /
        <select
          aria-label="New measure's time signature denominator"
          value={nextTimeSignature.denominator}
          onChange={(e) =>
            setNextTimeSignature((prev) => ({ ...prev, denominator: Number(e.target.value) }))
          }
        >
          {TIME_SIGNATURE_DENOMINATORS.map((denominator) => (
            <option key={denominator} value={denominator}>
              {denominator}
            </option>
          ))}
        </select>
      </span>
      <button type="button" onClick={handleAddMeasure}>
        + Add measure
      </button>
      <button type="button" onClick={handleExportPdf}>
        Export PDF
      </button>
      <button type="button" onClick={handleExportJpg}>
        Export JPG
      </button>
      <button type="button" onClick={handleSave}>
        Save
      </button>
      <button type="button" onClick={() => loadInputRef.current?.click()}>
        Load
      </button>
      <input
        ref={loadInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLoadFile(file);
          e.target.value = "";
        }}
      />
      <div ref={elementRef} />
    </>
  );
}

export default App;
