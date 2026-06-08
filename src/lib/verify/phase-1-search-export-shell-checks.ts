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

/** Stable surface label for export `/search` HTML shell failures (not hydration). */
export const EXPORT_SEARCH_SHELL_SURFACE = "route-shell" as const;

/** Stable check identifier for export search shell gate evidence rows. */
export const EXPORT_SEARCH_SHELL_CHECK_ID = "export-search-shell" as const;

export type Phase1ExportSearchShellFailureCategory =
  | "missing-input-shell"
  | "missing-state-region"
  | "shell-marker-mismatch"
  | "missing-artifact";

const HYDRATION_FAILURE_PATTERN =
  /hydrat|timed out|timeout|did not hydrate|within \d+ms/i;

/**
 * Classifies a raw shell assertion reason into a route-shell category that
 * planners can distinguish from hydration probe timeouts.
 */
export function classifyPhase1ExportSearchShellFailure(
  reason: string,
): Phase1ExportSearchShellFailureCategory {
  if (
    reason.includes("Missing export directory") ||
    reason.includes("Missing exported HTML")
  ) {
    return "missing-artifact";
  }

  if (
    reason.includes(SEARCH_PAGE_INPUT_HTML_MARKER) ||
    reason.includes("search-page-input")
  ) {
    return "missing-input-shell";
  }

  if (reason.includes("search state region")) {
    return "missing-state-region";
  }

  return "shell-marker-mismatch";
}

function formatPhase1ExportSearchShellCategoryLabel(
  category: Phase1ExportSearchShellFailureCategory,
): string {
  switch (category) {
    case "missing-input-shell":
      return "missing input shell";
    case "missing-state-region":
      return "missing state region";
    case "missing-artifact":
      return "missing export artifact";
    default:
      return "shell marker mismatch";
  }
}

/** Formats a single `/search` route-shell failure line for stderr output. */
export function formatPhase1ExportSearchShellFailure(reason: string): string {
  const category = classifyPhase1ExportSearchShellFailure(reason);
  const label = formatPhase1ExportSearchShellCategoryLabel(category);
  return `/search: ${EXPORT_SEARCH_SHELL_SURFACE} — ${label} — ${reason}`;
}

/** Returns true when a failure line names route-shell rather than hydration. */
export function isRouteShellExportSearchFailureLine(line: string): boolean {
  return (
    line.includes(EXPORT_SEARCH_SHELL_SURFACE) &&
    !HYDRATION_FAILURE_PATTERN.test(line)
  );
}

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
