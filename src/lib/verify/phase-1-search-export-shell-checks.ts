/** Observable HTML marker for the `/search` inline input shell. */
export const SEARCH_PAGE_INPUT_HTML_MARKER = 'id="search-page-input"';

/** Idle-state region marker emitted when no query is present on export. */
export const SEARCH_PAGE_IDLE_HTML_MARKER = 'data-testid="search-page-idle"';

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
    SEARCH_PAGE_IDLE_HTML_MARKER,
  ] as const;

  for (const marker of requiredMarkers) {
    if (!html.includes(marker)) {
      return `missing expected content: ${marker}`;
    }
  }

  if (html.includes(SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER)) {
    return `unexpected content: ${SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER}`;
  }

  if (html.toLowerCase().includes("lorem")) {
    return "unexpected content: lorem";
  }

  return null;
}
