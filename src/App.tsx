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
import type { Duration, Project, StringNumber } from "./domain/project";
import { STANDARD_BASS_TUNING } from "./domain/project";
import { MeasureGrid } from "./editor/MeasureGrid";
import { exportJpg } from "./export/exportJpg";
import { loadProjectFromIndexedDB, saveProjectToIndexedDB } from "./persistence/autosave";
import { parseSavedProject } from "./persistence/parseSavedProject";
import { projectToScore } from "./rendering/projectToScore";

const AUTOSAVE_DEBOUNCE_MS = 500;

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
  const [project, setProject] = useState<Project>(createEmptyProject);
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

  function handlePlaceNote(measureIndex: number, tick: number, string: StringNumber, fret: number) {
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
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = placeRestAt(measures[measureIndex], tick, DEFAULT_REST_DURATION);
      return { ...prev, measures };
    });
  }

  function handleChangeDuration(measureIndex: number, tick: number, duration: Duration) {
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = changeDuration(measures[measureIndex], tick, duration);
      return { ...prev, measures };
    });
  }

  function handleDeleteNote(measureIndex: number, tick: number) {
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = deleteNoteAt(measures[measureIndex], tick);
      return { ...prev, measures };
    });
  }

  function handleAddMeasure() {
    setProject((prev) => addMeasure(prev));
  }

  function handleChangeTitle(title: string) {
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
        aria-label="Project title"
      />
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
