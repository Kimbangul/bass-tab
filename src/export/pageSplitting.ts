// Pure page-break decision for JPG export (ticket 05 of .scratch/save-and-export).
// No AlphaTab/canvas/DOM dependency - callers read real system heights from
// AlphaTab's `boundsLookup` and pass them in as plain numbers.

/**
 * Groups systems (lines of music, in order) into pages without ever cutting
 * one across two pages. Greedily fills each page up to `maxPageHeight`; a
 * single system taller than `maxPageHeight` still gets a page of its own
 * rather than being dropped or split.
 *
 * Returns each page as the list of system indices (into `systemHeights`) it
 * contains, in their original order.
 */
export function splitSystemsIntoPages(systemHeights: number[], maxPageHeight: number): number[][] {
  const pages: number[][] = [];
  let currentPage: number[] = [];
  let currentHeight = 0;

  for (let i = 0; i < systemHeights.length; i++) {
    const height = systemHeights[i];
    if (currentPage.length > 0 && currentHeight + height > maxPageHeight) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(i);
    currentHeight += height;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  return pages;
}
