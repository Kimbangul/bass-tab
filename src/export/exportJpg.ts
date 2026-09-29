// JPG export (ticket 06 of .scratch/save-and-export): one JPG file per page,
// split between systems using ticket 05's algorithm.
//
// The DOM/canvas capture isn't unit-tested (same category as autosave.ts's
// IndexedDB wiring); `pageFittingHeights` and `computePageRegions` are pure
// and carry the tested logic.

import type { AlphaTabApi } from "@coderline/alphatab";
import { splitSystemsIntoPages } from "./pageSplitting";

// A4's height-to-width ratio, so a JPG "page" lines up with the same A4 page
// the PDF export (ADR-0005) prints, at the tab's own rendered width.
const A4_HEIGHT_TO_WIDTH_RATIO = 297 / 210;

export interface SystemBounds {
  y: number;
  h: number;
}

export interface PageRegion {
  top: number;
  height: number;
}

/**
 * The height to feed each system into `splitSystemsIntoPages`: the gap up to
 * the next system's start rather than its own glyph height, so a page's
 * grouping accounts for inter-system spacing too - otherwise a page that
 * looked like it fit under `maxPageHeight` could still render taller than
 * that once gaps between its systems are included (matching
 * `computePageRegions`, which measures real start-to-end pixel span).
 */
export function pageFittingHeights(systemBounds: SystemBounds[]): number[] {
  return systemBounds.map((bounds, i) => {
    const next = systemBounds[i + 1];
    return next ? next.y - bounds.y : bounds.h;
  });
}

/** Turns page groupings (ticket 05's output) into the pixel region each page
 * covers, reading every system's position from the same bounds the grouping
 * was computed from. */
export function computePageRegions(systemBounds: SystemBounds[], pages: number[][]): PageRegion[] {
  return pages.map((systemIndices) => {
    const first = systemBounds[systemIndices[0]];
    const last = systemBounds[systemIndices[systemIndices.length - 1]];
    return { top: first.y, height: last.y + last.h - first.y };
  });
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  return { canvas, context };
}

// Rasterizing via an <svg> wrapping a <foreignObject> (the usual DOM-to-canvas
// trick) taints the canvas in Chrome and permanently blocks toBlob/toDataURL,
// even with every resource inlined. Serializing AlphaTab's own <svg> elements
// directly avoids foreignObject entirely, so the canvas stays untainted;
// AlphaTab bakes music symbols as vector paths (needed for its non-browser
// engines too), so no font loading is needed to rasterize them correctly.
async function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const markup = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to rasterize a rendered system for JPG export"));
    img.src = url;
  });
  URL.revokeObjectURL(url);
  return image;
}

/**
 * Rasterizes the whole rendered surface into one canvas, positioning each
 * system's image with the same `boundsLookup` coordinates used to decide
 * page breaks - not the DOM's `getBoundingClientRect()`, which lives in a
 * separate (CSS pixel) coordinate space that isn't guaranteed to match
 * AlphaTab's internal render units.
 */
async function rasterizeSurface(surface: HTMLElement, systems: SystemBounds[], width: number, height: number): Promise<HTMLCanvasElement> {
  const { canvas, context } = createCanvas(width, height);

  const svgs = Array.from(surface.querySelectorAll("svg"));
  for (let i = 0; i < systems.length && i < svgs.length; i++) {
    const bounds = systems[i];
    const image = await svgToImage(svgs[i]);
    context.drawImage(image, 0, bounds.y, width, bounds.h);
  }
  return canvas;
}

function downloadCanvasAsJpg(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode a page as JPG"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/jpeg");
  });
}

/**
 * Exports the currently rendered score as one JPG file per page. `container`
 * is the element passed to `AlphaTabApi` (this looks up its `.at-surface`
 * itself, the one place that needs to know AlphaTab's internal DOM
 * structure); `baseFilename` should already be sanitized (e.g. via the same
 * helper Save uses).
 */
export async function exportJpg(api: AlphaTabApi, container: HTMLElement, baseFilename: string): Promise<void> {
  const systems = api.renderer.boundsLookup?.staffSystems ?? [];
  if (systems.length === 0) return;

  const surface = container.querySelector<HTMLElement>(".at-surface");
  if (!surface) return;

  const width = Math.ceil(api.renderer.width);
  const systemBounds = systems.map((system) => system.realBounds);
  const maxPageHeight = width * A4_HEIGHT_TO_WIDTH_RATIO;
  const pages = splitSystemsIntoPages(pageFittingHeights(systemBounds), maxPageHeight);
  const regions = computePageRegions(systemBounds, pages);

  const totalHeight = Math.ceil(Math.max(...systemBounds.map((bounds) => bounds.y + bounds.h)));
  const fullCanvas = await rasterizeSurface(surface, systemBounds, width, totalHeight);

  for (let pageIndex = 0; pageIndex < regions.length; pageIndex++) {
    const region = regions[pageIndex];
    const { canvas: pageCanvas, context } = createCanvas(width, Math.ceil(region.height));
    context.drawImage(fullCanvas, 0, region.top, width, region.height, 0, 0, width, region.height);
    await downloadCanvasAsJpg(pageCanvas, `${baseFilename}-page-${pageIndex + 1}.jpg`);
  }
}
