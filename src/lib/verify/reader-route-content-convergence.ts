import {
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  stripHtmlScripts,
} from "@/lib/navigation/docs-sidebar-contract";

/** Stable failure reasons for Phase 1 home and search route content checks. */
export const READER_ROUTE_CONTENT_CONVERGENCE_REASONS = {
  missingModelAtlas: 'missing home title marker ("Model Atlas")',
  missingSearchTitle: 'missing search page title marker ("Search")',
  placeholderCopy: `placeholder scaffold copy detected (${PLACEHOLDER_SIDEBAR_DESCRIPTION})`,
  loremPlaceholder: "placeholder lorem copy detected",
} as const;

export type ReaderRouteContentConvergenceReason =
  (typeof READER_ROUTE_CONTENT_CONVERGENCE_REASONS)[keyof typeof READER_ROUTE_CONTENT_CONVERGENCE_REASONS];

function assertNoPlaceholderCopy(html: string): string | null {
  if (html.includes(PLACEHOLDER_SIDEBAR_DESCRIPTION)) {
    return READER_ROUTE_CONTENT_CONVERGENCE_REASONS.placeholderCopy;
  }

  if (html.toLowerCase().includes("lorem")) {
    return READER_ROUTE_CONTENT_CONVERGENCE_REASONS.loremPlaceholder;
  }

  return null;
}

/**
 * Returns the first home route content failure reason, or null when HTML includes
 * the Phase 1 manual-gate Model Atlas marker and no placeholder copy.
 */
export function assertHomeRouteContentConvergence(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes("Model Atlas")) {
    return READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingModelAtlas;
  }

  return assertNoPlaceholderCopy(visibleHtml);
}

/**
 * Returns the first search route content failure reason, or null when HTML includes
 * the Phase 1 manual-gate Search marker and no placeholder copy.
 */
export function assertSearchRouteContentConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes("Search")) {
    return READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingSearchTitle;
  }

  return assertNoPlaceholderCopy(visibleHtml);
}
