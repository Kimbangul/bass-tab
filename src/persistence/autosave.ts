// Silent IndexedDB auto-save/restore (ticket 03 of .scratch/save-and-export).
// Not unit-tested - this is browser-storage wiring, the same category as
// MeasureGrid's DOM event handling; parseSavedProject (which it reuses for
// validation) carries the tested logic.

import { openDB } from "idb";
import type { Project } from "../domain/project";
import { parseSavedProject } from "./parseSavedProject";

const DB_NAME = "bass-tab-editor";
const STORE_NAME = "autosave";
const CURRENT_PROJECT_KEY = "current-project";

function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

export async function saveProjectToIndexedDB(project: Project): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, JSON.stringify(project), CURRENT_PROJECT_KEY);
}

/** Restores the last auto-saved Project, or null if there isn't one (first
 * run) or it can't be parsed (e.g. from an older, incompatible version). */
export async function loadProjectFromIndexedDB(): Promise<Project | null> {
  try {
    const db = await getDB();
    const stored = await db.get(STORE_NAME, CURRENT_PROJECT_KEY);
    return typeof stored === "string" ? parseSavedProject(stored) : null;
  } catch {
    return null;
  }
}
