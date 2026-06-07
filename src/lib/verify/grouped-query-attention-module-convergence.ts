import { MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS } from "@/features/models/components/module-attention-math-variable-definitions";

export const GROUPED_QUERY_ATTENTION_MODULE_TITLE =
  "Grouped-Query Attention" as const;

/** Stable markers for Phase 1 grouped-query-attention module page convergence. */
export const GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS = [
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
  'data-registry-id="module.grouped-query-attention"',
  "At a glance",
  'data-testid="tag-pill-list"',
  "Compared To Nearby Modules",
  "Related",
  'data-graph-node-id="hidden-states"',
  'data-graph-node-id="query-groups"',
  'data-graph-node-count="6"',
  'data-react-flow-graph="true"',
  'data-graph-id="graph.grouped-query-attention-compute-flow"',
  "--xy-node-color",
  "--xy-node-background-color",
  'href="/docs/modules/multi-head-attention"',
  'data-prose-auto-link="true"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.grouped-query-attention-comparison"',
  "KV head count",
  'href="/docs/modules/multi-query-attention"',
  'data-comparison-dimension="cacheFootprint"',
  'data-attention-schema-comparison="true"',
  'data-attention-schema-variable-definitions="true"',
  "What the symbols mean",
  'data-message-block-math="math.mhaSchema.formula"',
  'data-message-block-math="math.gqaSchema.formula"',
  'class="katex"',
  "katex-display",
  ...MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  "Query projection",
  "Key projection",
  "Value projection",
  "Query heads",
  "Key-value heads",
  "Query-to-KV grouping",
] as const;

export const GROUPED_QUERY_ATTENTION_MATH_DEFINITION_MARKERS =
  MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  );

export const GROUPED_QUERY_ATTENTION_GRAPH_THEME_MARKERS = [
  "--xy-node-color",
  "--xy-node-background-color",
] as const;

/** Minimal inner HTML that satisfies {@link assertGroupedQueryAttentionModuleConvergence}. */
export function buildGroupedQueryAttentionStubBody(): string {
  const graphWrapper = `<div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-flow" style="--xy-node-color:var(--card-foreground);--xy-node-background-color:var(--card)"></div>`;
  const tagPillList = `<ul data-testid="tag-pill-list" aria-label="Tags"></ul>`;
  const mathDefinitions = MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `<span data-math-variable-definition="${id}"></span>`,
  ).join("");
  const mathDefinitionTerms = [
    "Query projection",
    "Key projection",
    "Value projection",
    "Query heads",
    "Key-value heads",
    "Query-to-KV grouping",
  ]
    .map((term) => `<span>${term}</span>`)
    .join("");

  const staticMarkers = GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS.filter(
    (marker) =>
      !marker.startsWith("data-math-variable-definition=") &&
      marker !== 'data-react-flow-graph="true"' &&
      marker !== 'data-graph-id="graph.grouped-query-attention-compute-flow"' &&
      marker !== 'data-testid="tag-pill-list"' &&
      marker !== "--xy-node-color" &&
      marker !== "--xy-node-background-color" &&
      marker !== "Query projection" &&
      marker !== "Key projection" &&
      marker !== "Value projection" &&
      marker !== "Query heads" &&
      marker !== "Key-value heads" &&
      marker !== "Query-to-KV grouping",
  );

  const renderedMarkers = staticMarkers.map((marker) => {
    if (marker === 'class="katex"') {
      return '<span class="katex"></span>';
    }
    if (marker.includes("=")) {
      return `<span ${marker}></span>`;
    }
    return `<span>${marker}</span>`;
  });

  return [
    graphWrapper,
    tagPillList,
    mathDefinitions,
    mathDefinitionTerms,
    ...renderedMarkers,
  ].join("");
}

export const GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS = [
  "Variants And Nearby Modules",
  'data-testid="derived-related-docs"',
  'aria-label="Module metadata"',
  ">table.grouped-query-attention-comparison<",
  ">graph.grouped-query-attention-compute-flow<",
  ">graph.grouped-query-attention-compute-schema<",
  'data-graph-id="graph.grouped-query-attention-compute-schema"',
] as const;

export const GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS = {
  duplicateBodyTitle:
    "duplicate Grouped-Query Attention h1 in module body or shell",
  moduleMetadataCard: "module metadata card still present",
  duplicateTagPillList: "duplicate tag pill list surfaces",
  missingTagPillList: "tag pill list marker missing from module page",
  duplicateReactFlowGraph: "multiple React Flow graph canvases on module page",
  missingReactFlowGraph: "React Flow graph canvas missing from module page",
  missingThemedNodeColors:
    "React Flow node theme CSS variables missing from graph wrapper",
  missingMathDefinitions:
    "plain-language math variable definitions missing from schema section",
} as const;

/** Graph accessibility/build markers derived from {@link GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS}. */
export const GROUPED_QUERY_ATTENTION_GRAPH_BUILD_MARKERS =
  GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS.filter(
    (marker) =>
      marker.startsWith("data-graph-node-") ||
      marker === 'data-react-flow-graph="true"',
  );

/** Graph placeholder stubs derived from {@link GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS}. */
export const GROUPED_QUERY_ATTENTION_GRAPH_FORBIDDEN_MARKERS =
  GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS.filter((marker) =>
    marker.includes("graph."),
  );

const H1_PATTERN = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMarkerOccurrences(html: string, marker: string): number {
  return (html.match(new RegExp(escapeRegExp(marker), "g")) ?? []).length;
}

function countH1BlocksContaining(html: string, text: string): number {
  const blocks = html.match(H1_PATTERN) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

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
 * Returns a failure reason when the module body repeats the shell title as an
 * h1 or when multiple h1 blocks contain the module title.
 */
export function assertGroupedQueryAttentionTitleConvergence(
  html: string,
): string | null {
  if (countH1BlocksContaining(html, GROUPED_QUERY_ATTENTION_MODULE_TITLE) > 1) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateBodyTitle;
  }

  if (
    new RegExp(
      `<h1\\b[^>]*>\\s*${escapeRegExp(GROUPED_QUERY_ATTENTION_MODULE_TITLE)}\\s*</h1>`,
      "i",
    ).test(html) &&
    html.includes('data-registry-id="module.grouped-query-attention"')
  ) {
    const registryIndex = html.indexOf(
      'data-registry-id="module.grouped-query-attention"',
    );
    const h1Index = html.search(
      new RegExp(
        `<h1\\b[^>]*>\\s*${escapeRegExp(GROUPED_QUERY_ATTENTION_MODULE_TITLE)}\\s*</h1>`,
        "i",
      ),
    );
    if (h1Index >= registryIndex) {
      return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateBodyTitle;
    }
  }

  return null;
}

/**
 * Returns a failure reason when pre-repair metadata card or duplicate tag pill
 * list surfaces remain on the GQA module page.
 */
export function assertGroupedQueryAttentionChromeConvergence(
  html: string,
): string | null {
  if (html.includes('aria-label="Module metadata"')) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.moduleMetadataCard;
  }

  const tagPillCount = countMarkerOccurrences(
    html,
    'data-testid="tag-pill-list"',
  );
  if (tagPillCount === 0) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingTagPillList;
  }
  if (tagPillCount > 1) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateTagPillList;
  }

  return assertGroupedQueryAttentionTitleConvergence(html);
}

/**
 * Returns a failure reason when the GQA module page renders zero or multiple
 * React Flow graph canvases.
 */
export function assertGroupedQueryAttentionSingleGraphConvergence(
  html: string,
): string | null {
  const graphCount = countMarkerOccurrences(
    html,
    'data-react-flow-graph="true"',
  );
  if (graphCount === 0) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingReactFlowGraph;
  }
  if (graphCount > 1) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateReactFlowGraph;
  }

  return null;
}

/**
 * Returns a failure reason when themed React Flow node CSS variables are absent
 * from the graph wrapper.
 */
export function assertGroupedQueryAttentionGraphThemeConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    GROUPED_QUERY_ATTENTION_GRAPH_THEME_MARKERS,
  );
  if (missing) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingThemedNodeColors;
  }

  return null;
}

/**
 * Returns a failure reason when plain-language math variable definitions are
 * missing from the attention schema comparison region.
 */
export function assertGroupedQueryAttentionMathDefinitionsConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(html, [
    'data-attention-schema-variable-definitions="true"',
    "What the symbols mean",
    ...GROUPED_QUERY_ATTENTION_MATH_DEFINITION_MARKERS,
    "Query projection",
    "Key projection",
    "Value projection",
    "Query heads",
    "Key-value heads",
    "Query-to-KV grouping",
  ]);
  if (missing) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingMathDefinitions;
  }

  return null;
}

/**
 * Returns the first GQA module graph build-marker failure reason, or null when
 * built HTML includes required graph node markers and excludes graph stubs.
 */
export function assertGroupedQueryAttentionGraphBuildMarkersConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    GROUPED_QUERY_ATTENTION_GRAPH_BUILD_MARKERS,
  );
  if (missing) {
    return missing;
  }

  const forbidden = forbidSubstrings(
    html,
    GROUPED_QUERY_ATTENTION_GRAPH_FORBIDDEN_MARKERS,
  );
  if (forbidden) {
    return forbidden;
  }

  const singleGraph = assertGroupedQueryAttentionSingleGraphConvergence(html);
  if (singleGraph) {
    return singleGraph;
  }

  const theme = assertGroupedQueryAttentionGraphThemeConvergence(html);
  if (theme) {
    return theme;
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

  const chrome = assertGroupedQueryAttentionChromeConvergence(html);
  if (chrome) {
    return chrome;
  }

  const singleGraph = assertGroupedQueryAttentionSingleGraphConvergence(html);
  if (singleGraph) {
    return singleGraph;
  }

  const theme = assertGroupedQueryAttentionGraphThemeConvergence(html);
  if (theme) {
    return theme;
  }

  const mathDefinitions =
    assertGroupedQueryAttentionMathDefinitionsConvergence(html);
  if (mathDefinitions) {
    return mathDefinitions;
  }

  if (html.toLowerCase().includes("lorem")) {
    return "placeholder lorem copy detected";
  }

  return null;
}
