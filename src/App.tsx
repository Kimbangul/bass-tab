import { AlphaTabApi } from "@coderline/alphatab";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  addMeasure,
  changeDuration,
  createEmptyMeasure,
  DEFAULT_DURATION,
  deleteNoteAt,
  placeNoteAt,
  placeRestAt,
} from "./domain/editing";
import type { Duration, Project, StringNumber } from "./domain/project";
import { STANDARD_BASS_TUNING } from "./domain/project";
import { MeasureGrid } from "./editor/MeasureGrid";
import { projectToScore } from "./rendering/projectToScore";

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
  const [project, setProject] = useState<Project>(createEmptyProject);

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
        duration: DEFAULT_DURATION,
      });
      return { ...prev, measures };
    });
  }

  function handlePlaceRest(measureIndex: number, tick: number) {
    setProject((prev) => {
      const measures = [...prev.measures];
      measures[measureIndex] = placeRestAt(measures[measureIndex], tick, DEFAULT_DURATION);
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

  return (
    <>
      <h1>Bass Tab Editor</h1>
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
      <div ref={elementRef} />
    </>
  );
}

export default App;
