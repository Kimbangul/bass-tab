import { AlphaTabApi } from "@coderline/alphatab";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { createEmptyMeasure, DEFAULT_DURATION, placeNoteAt } from "./domain/editing";
import type { Project, StringNumber } from "./domain/project";
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

  return (
    <>
      <h1>Bass Tab Editor</h1>
      {project.measures.map((measure, index) => (
        <MeasureGrid
          key={index}
          measure={measure}
          onPlaceNote={(tick, string, fret) => handlePlaceNote(index, tick, string, fret)}
        />
      ))}
      <div ref={elementRef} />
    </>
  );
}

export default App;
