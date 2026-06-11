import { extractNdTocHtml } from "@/lib/navigation/docs-page-toc-contract";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import {
  SEARCH_PAGE_IDLE_HTML_MARKER,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "./phase-1-search-export-shell-checks";
import {
  ATTENTION_TAG_LANDING_PATH,
  TAGS_NAVIGATION_CONVERGENCE_REASONS,
} from "./tags-navigation-convergence";

export const SEARCH_ACCESSIBILITY_ROUTE = "/search" as const;
export const TAGS_INDEX_ACCESSIBILITY_ROUTE = "/tags" as const;
export const ATTENTION_TAG_ACCESSIBILITY_ROUTE = ATTENTION_TAG_LANDING_PATH;
export const GQA_ACCESSIBILITY_ROUTE =
  "/docs/modules/grouped-query-attention" as const;

/** Theme-token focus ring classes required on keyboard-focusable docs surfaces. */
export const ACCESSIBILITY_FOCUS_RING_MARKERS = [
  "focus-visible:ring-ring",
  "focus-visible:outline-ring",
] as const;

export const SEARCH_ACCESSIBILITY_MARKERS = [
  SEARCH_PAGE_INPUT_HTML_MARKER,
  'aria-live="polite"',
  SEARCH_PAGE_IDLE_HTML_MARKER,
  ACCESSIBILITY_FOCUS_RING_MARKERS[0],
] as const;

export const TAGS_INDEX_ACCESSIBILITY_MARKERS = [
  'aria-label="Primary"',
  ACCESSIBILITY_FOCUS_RING_MARKERS[0],
  "group block rounded-lg",
] as const;

export const ATTENTION_TAG_ACCESSIBILITY_MARKERS = [
  'aria-label="Primary"',
  ACCESSIBILITY_FOCUS_RING_MARKERS[0],
  'data-search=""',
] as const;

export const GQA_ACCESSIBILITY_MARKERS = [
  'id="nd-sidebar"',
  'id="nd-toc"',
  'data-attention-variant-option="mha"',
  'data-attention-variant-option="gqa"',
  'role="tablist"',
  ACCESSIBILITY_FOCUS_RING_MARKERS[1],
] as const;

export const ACCESSIBILITY_CONVERGENCE_REASONS = {
  missingSearchInput: `search page missing input marker (${SEARCH_PAGE_INPUT_HTML_MARKER})`,
  missingSearchLiveRegion:
    'search page missing aria-live="polite" outcome region',
  missingSearchIdleState: `search page missing idle state marker (${SEARCH_PAGE_IDLE_HTML_MARKER})`,
  missingSearchFocusRing:
    "search page missing focus-visible ring token on interactive controls",
  missingTagsFocusRing:
    "tags index missing focus-visible ring token on tag navigation links",
  missingAttentionTagSearchHandoff:
    "attention tag landing missing keyboard-focusable search handoff control",
  missingAttentionTagFocusRing:
    "attention tag landing missing focus-visible ring token on navigation links",
  missingGqaToc:
    'grouped-query-attention missing Fumadocs TOC region (id="nd-toc")',
  missingGqaGraphSwitcher:
    "grouped-query-attention missing attention variant tablist controls",
  missingGqaFocusRing:
    "grouped-query-attention graph switcher missing focus-visible outline ring token",
} as const;

function hasAnyFocusRingMarker(html: string): boolean {
  return ACCESSIBILITY_FOCUS_RING_MARKERS.some((marker) =>
    html.includes(marker),
  );
}

function requireSubstrings(
  html: string,
  markers: readonly string[],
): string | null {
  for (const marker of markers) {
    if (!html.includes(marker)) {
      return marker;
    }
  }
  return null;
}

/**
 * Returns a failure reason when `/search` lacks search state contracts or
 * keyboard-focus ring markers in rendered HTML.
 */
export function assertSearchPageAccessibilityConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes(SEARCH_PAGE_INPUT_HTML_MARKER)) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingSearchInput;
  }

  if (!visibleHtml.includes('aria-live="polite"')) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingSearchLiveRegion;
  }

  if (!visibleHtml.includes(SEARCH_PAGE_IDLE_HTML_MARKER)) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingSearchIdleState;
  }

  if (!hasAnyFocusRingMarker(visibleHtml)) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingSearchFocusRing;
  }

  return null;
}

/**
 * Returns a failure reason when the tags index lacks focus-ring tokens on
 * keyboard-focusable navigation links.
 */
export function assertTagsIndexAccessibilityConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes('aria-label="Primary"')) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav;
  }

  if (!hasAnyFocusRingMarker(visibleHtml)) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingTagsFocusRing;
  }

  return null;
}

/**
 * Returns a failure reason when the attention tag landing lacks search handoff
 * controls or focus-ring tokens on navigation links.
 */
export function assertAttentionTagAccessibilityConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes('aria-label="Primary"')) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav;
  }

  if (!visibleHtml.includes('data-search=""')) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingAttentionTagSearchHandoff;
  }

  if (!hasAnyFocusRingMarker(visibleHtml)) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingAttentionTagFocusRing;
  }

  return null;
}

/**
 * Returns a failure reason when grouped-query-attention lacks TOC navigation,
 * graph switcher controls, or focus-ring tokens for keyboard users.
 */
export function assertGroupedQueryAttentionAccessibilityConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  const toc = extractNdTocHtml(visibleHtml);
  if (toc.length === 0 || !toc.includes('href="#')) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingGqaToc;
  }

  const missingSwitcher = requireSubstrings(visibleHtml, [
    'data-attention-variant-option="mha"',
    'data-attention-variant-option="gqa"',
    'role="tablist"',
  ]);
  if (missingSwitcher) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingGqaGraphSwitcher;
  }

  if (!visibleHtml.includes(ACCESSIBILITY_FOCUS_RING_MARKERS[1])) {
    return ACCESSIBILITY_CONVERGENCE_REASONS.missingGqaFocusRing;
  }

  return null;
}
