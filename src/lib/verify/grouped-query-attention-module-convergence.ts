/** Stable markers for Phase 1 grouped-query-attention module page convergence. */
export const GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS = [
  "Grouped-Query Attention",
  'data-registry-id="module.grouped-query-attention"',
  "Compared To Nearby Modules",
  "Related",
  'data-graph-node-id="hidden-states"',
  'data-graph-node-id="query-groups"',
  'data-graph-node-id="query-heads"',
  'data-graph-node-id="kv-cache"',
  'data-graph-node-count="6"',
  'data-graph-node-count="5"',
  'data-react-flow-graph="true"',
  'href="/docs/modules/multi-head-attention"',
  'data-prose-auto-link="true"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.grouped-query-attention-comparison"',
  "KV head count",
  'href="/docs/modules/multi-query-attention"',
  'data-comparison-dimension="cacheFootprint"',
  'data-attention-schema-comparison="true"',
  'data-message-block-math="math.mhaSchema.formula"',
  'data-message-block-math="math.gqaSchema.formula"',
  'class="katex"',
  "katex-display",
] as const;

/** Minimal inner HTML that satisfies {@link assertGroupedQueryAttentionModuleConvergence}. */
export function buildGroupedQueryAttentionStubBody(): string {
  return GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS.map((marker) => {
    if (marker === 'class="katex"') {
      return '<span class="katex"></span>';
    }
    if (marker.includes("=")) {
      return `<span ${marker}></span>`;
    }
    return `<span>${marker}</span>`;
  }).join("");
}

export const GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS = [
  "Variants And Nearby Modules",
  'data-testid="derived-related-docs"',
  ">table.grouped-query-attention-comparison<",
  ">graph.grouped-query-attention-compute-flow<",
  ">graph.grouped-query-attention-compute-schema<",
] as const;

function requireSubstrings(
  html: string,
  substrings: readonly string[],
): string | null {
  for (const substring of substrings) {
    if (!html.includes(substring)) {
      return `missing expected content: ${substring}`;
    }
  }
  return null;
}

function forbidSubstrings(
  html: string,
  substrings: readonly string[],
): string | null {
  for (const substring of substrings) {
    if (html.includes(substring)) {
      return `unexpected content: ${substring}`;
    }
  }
  return null;
}

/**
 * Returns the first GQA module page content failure reason, or null when HTML
 * includes Phase 1 converged markers and excludes placeholder-only stubs.
 */
export function assertGroupedQueryAttentionModuleConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS,
  );
  if (missing) {
    return missing;
  }

  const forbidden = forbidSubstrings(
    html,
    GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS,
  );
  if (forbidden) {
    return forbidden;
  }

  if (html.toLowerCase().includes("lorem")) {
    return "placeholder lorem copy detected";
  }

  return null;
}
