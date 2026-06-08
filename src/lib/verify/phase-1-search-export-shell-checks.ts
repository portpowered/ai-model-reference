import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_EXPORT_OUT_DIR,
  resolveExportHtmlFilePath,
  verifyExportOutDirectory,
} from "@/lib/build/verify-phase-1-export-routes";

/** Observable HTML marker for the `/search` inline input shell. */
export const SEARCH_PAGE_INPUT_HTML_MARKER = 'id="search-page-input"';

/** Idle-state region marker emitted when no query is present on export. */
export const SEARCH_PAGE_IDLE_HTML_MARKER = 'data-testid="search-page-idle"';

/** Results region marker when export HTML includes ranked hits. */
export const SEARCH_PAGE_RESULTS_HTML_MARKER =
  'data-testid="search-page-results"';

/** Empty-state region marker when export HTML includes a zero-hit surface. */
export const SEARCH_PAGE_EMPTY_HTML_MARKER = 'data-testid="search-page-empty"';

/** Observable state-region markers below the search input on `/search`. */
export const SEARCH_PAGE_EXPORT_STATE_REGION_MARKERS = [
  SEARCH_PAGE_IDLE_HTML_MARKER,
  SEARCH_PAGE_RESULTS_HTML_MARKER,
  SEARCH_PAGE_EMPTY_HTML_MARKER,
] as const;

/** Legacy Suspense fallback pattern that must not be the sole search entry surface. */
export const SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER =
  'aria-hidden="true"><span>';

/** Minimal stub body for tests that exercise `/search` route assertions. */
export function buildSearchPageExportShellStubBody(): string {
  return `<h1>Search</h1>
<p>Search Model Atlas by title, alias, or tag.</p>
<p>Canonical search entry URL: /search. Query handoffs may append ?q=&lt;term&gt;; tag handoffs may append ?tag=&lt;slug&gt;.</p>
<input ${SEARCH_PAGE_INPUT_HTML_MARKER} data-search="" type="search" placeholder="Search Model Atlas" />
<output ${SEARCH_PAGE_IDLE_HTML_MARKER}>Start typing to search.</output>`;
}

/**
 * Returns the first state-region failure for `/search` export HTML, or null when
 * at least one idle/results/empty marker is present.
 */
export function assertSearchPageExportShellStateRegion(
  html: string,
): string | null {
  for (const marker of SEARCH_PAGE_EXPORT_STATE_REGION_MARKERS) {
    if (html.includes(marker)) {
      return null;
    }
  }

  return `missing search state region: expected one of ${SEARCH_PAGE_EXPORT_STATE_REGION_MARKERS.join(", ")}`;
}

/**
 * Returns the first export-shell failure reason for `/search`, or null when the
 * HTML includes the real search input shell and Phase 1 manual-gate copy.
 */
export function assertSearchPageExportShell(html: string): string | null {
  const requiredMarkers = [
    "Search",
    "Search Model Atlas",
    "/search",
    "?q=",
    SEARCH_PAGE_INPUT_HTML_MARKER,
  ] as const;

  for (const marker of requiredMarkers) {
    if (!html.includes(marker)) {
      return `missing expected content: ${marker}`;
    }
  }

  const stateRegionFailure = assertSearchPageExportShellStateRegion(html);
  if (stateRegionFailure) {
    return stateRegionFailure;
  }

  if (html.includes(SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER)) {
    return `unexpected content: ${SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER}`;
  }

  if (html.toLowerCase().includes("lorem")) {
    return "unexpected content: lorem";
  }

  return null;
}

export type VerifyPhase1ExportSearchShellResult =
  | { ok: true }
  | { ok: false; reason: string };

export type VerifyPhase1ExportSearchShellOptions = {
  outDir?: string;
  cwd?: string;
};

/**
 * Verifies exported `out/search.html` includes the real search input shell and
 * a state region marker appropriate to the no-query export surface.
 */
export function verifyPhase1ExportSearchShellFromOutDir(
  outDir: string = DEFAULT_EXPORT_OUT_DIR,
  options: VerifyPhase1ExportSearchShellOptions = {},
): VerifyPhase1ExportSearchShellResult {
  const cwd = options.cwd ?? process.cwd();
  const directoryResult = verifyExportOutDirectory(outDir, cwd);
  if (!directoryResult.ok) {
    return directoryResult;
  }

  const relativeHtmlPath = join(outDir, "search.html");
  const filePath = resolveExportHtmlFilePath(outDir, "/search", cwd);
  if (!existsSync(filePath)) {
    return {
      ok: false,
      reason: `Missing exported HTML at ${relativeHtmlPath} for route /search.`,
    };
  }

  const html = readFileSync(filePath, "utf8");
  const shellFailure = assertSearchPageExportShell(html);
  if (shellFailure) {
    return { ok: false, reason: shellFailure };
  }

  return { ok: true };
}
