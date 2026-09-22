import { AlphaTabApi } from "@coderline/alphatab";
import { useEffect, useRef } from "react";
import "./App.css";
import type { Project } from "./domain/project";
import { STANDARD_BASS_TUNING } from "./domain/project";
import { projectToScore } from "./rendering/projectToScore";

// Walking-skeleton demo Project: proves projectToScore + AlphaTab actually
// render in a browser. Not the editor UI (that's a later step).
const demoProject: Project = {
  title: "Walking Skeleton",
  tuning: STANDARD_BASS_TUNING,
  measures: [
    {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [
        { kind: "note", string: 4, fret: 0, duration: "quarter" },
        { kind: "note", string: 3, fret: 2, duration: "quarter" },
        { kind: "note", string: 2, fret: 2, duration: "quarter" },
        { kind: "note", string: 1, fret: 0, duration: "quarter" },
      ],
    },
    {
      timeSignature: { numerator: 4, denominator: 4 },
      slots: [
        { kind: "note", string: 1, fret: 3, duration: "eighth" },
        { kind: "note", string: 1, fret: 0, duration: "eighth" },
        { kind: "rest", duration: "half" },
      ],
    },
  ],
};

function App() {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = new AlphaTabApi(elementRef.current!, {
      core: {
        fontDirectory: "/font/",
      },
      player: {
        enablePlayer: false,
      },
    });

    api.renderScore(projectToScore(demoProject));

    return () => {
      api.destroy();
    };
  }, []);

  return (
    <>
      <h1>Bass Tab Editor — walking skeleton</h1>
      <div ref={elementRef} />
    </>
  );
}

export default App;
