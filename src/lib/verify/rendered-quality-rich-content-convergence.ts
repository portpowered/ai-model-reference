/** Stable markers for rendered rich-content overflow guards. */
export const RICH_CONTENT_TABLE_SCROLL_MARKER =
  'data-rich-content-scroll="table"';
export const RICH_CONTENT_CODE_SCROLL_MARKER =
  'data-rich-content-scroll="code"';
export const RICH_CONTENT_MATH_SCROLL_MARKER =
  'data-rich-content-scroll="math"';

export const GQA_RICH_CONTENT_ROUTE =
  "/docs/modules/grouped-query-attention" as const;
export const BACKPROPAGATION_RICH_CONTENT_ROUTE =
  "/docs/glossary/backpropagation" as const;

export const RICH_CONTENT_CONVERGENCE_REASONS = {
  missingTableScrollMarker:
    "comparison table missing data-rich-content-scroll table marker",
  missingTableScrollWrapper:
    "comparison table missing overflow-x-auto scroll wrapper",
  missingCodeScrollMarker:
    "fenced code block missing data-rich-content-scroll code marker",
  missingCodeScrollRegion: "fenced code block missing accessible scroll region",
  missingMathScrollMarker:
    "block math missing data-rich-content-scroll math marker",
} as const;

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
 * Returns a failure reason when grouped-query-attention lacks table or math
 * overflow guard markers in rendered HTML.
 */
export function assertGroupedQueryAttentionRichContentConvergence(
  html: string,
): string | null {
  const tableRegionMatch =
    /<figure[^>]*\bdata-registry-comparison-table="true"[^>]*>[\s\S]*?<\/figure>/i.exec(
      html,
    );
  if (!tableRegionMatch) {
    return "comparison table figure missing from rendered HTML";
  }

  const tableRegion = tableRegionMatch[0];
  const missingTable = requireSubstrings(tableRegion, [
    RICH_CONTENT_TABLE_SCROLL_MARKER,
    "registry-comparison-table__scroll",
    "overflow-x-auto",
  ]);
  if (missingTable === RICH_CONTENT_TABLE_SCROLL_MARKER) {
    return RICH_CONTENT_CONVERGENCE_REASONS.missingTableScrollMarker;
  }
  if (missingTable) {
    return RICH_CONTENT_CONVERGENCE_REASONS.missingTableScrollWrapper;
  }

  if (!html.includes(RICH_CONTENT_MATH_SCROLL_MARKER)) {
    return RICH_CONTENT_CONVERGENCE_REASONS.missingMathScrollMarker;
  }

  return null;
}

/**
 * Returns a failure reason when backpropagation lacks code or math overflow
 * guard markers in rendered HTML.
 */
export function assertBackpropagationRichContentConvergence(
  html: string,
): string | null {
  const missingCode = requireSubstrings(html, [
    RICH_CONTENT_CODE_SCROLL_MARKER,
    'role="region"',
  ]);
  if (missingCode === RICH_CONTENT_CODE_SCROLL_MARKER) {
    return RICH_CONTENT_CONVERGENCE_REASONS.missingCodeScrollMarker;
  }
  if (missingCode === 'role="region"') {
    return RICH_CONTENT_CONVERGENCE_REASONS.missingCodeScrollRegion;
  }

  if (!html.includes(RICH_CONTENT_MATH_SCROLL_MARKER)) {
    return RICH_CONTENT_CONVERGENCE_REASONS.missingMathScrollMarker;
  }

  return null;
}
