import {
  MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_GQA_ONLY_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS,
  MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
} from "@/features/models/components/module-attention-math-variable-definitions";

export const GROUPED_QUERY_ATTENTION_MODULE_TITLE =
  "Grouped-Query Attention" as const;

/** Stable markers for Phase 1 grouped-query-attention module page convergence. */
export const GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS = [
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
  'data-registry-id="module.grouped-query-attention"',
  "At a glance",
  'data-testid="tag-pill-list"',
  "Compared To Nearby Modules",
  'id="compared-to-nearby-modules"',
  "Related",
  'id="related"',
  'data-testid="curated-related-docs"',
  'data-attention-variant-comparison="true"',
  'data-attention-variant-active="gqa"',
  'data-attention-variant-option="mha"',
  'data-attention-variant-option="gqa"',
  'data-graph-node-id="gqa-query-heads"',
  'data-graph-node-id="gqa-kv-groups"',
  'data-head-count-role="query"',
  'data-head-count-role="kv"',
  'data-graph-node-count="11"',
  'data-react-flow-graph="true"',
  'data-graph-id="graph.grouped-query-attention-gqa-comparison"',
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
  'href="/docs/modules/attention"',
  'href="/docs/modules/multi-head-attention"',
  'data-prose-auto-link="true"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.grouped-query-attention-comparison"',
  "Key-value head count",
  'href="/docs/modules/multi-query-attention"',
  'data-comparison-dimension="cacheFootprint"',
  'data-attention-schema-comparison="true"',
  'data-math-schema="mha"',
  'data-math-schema="gqa"',
  'data-message-block-math="math.mhaSchema.formula"',
  'data-message-block-math="math.gqaSchema.formula"',
  'class="katex"',
  "katex-display",
  'data-attention-schema-variable-definitions="true"',
  ...MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  ...MODULE_ATTENTION_GQA_ONLY_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
] as const;

export const GROUPED_QUERY_ATTENTION_MATH_DEFINITION_MARKERS = [
  'data-attention-schema-variable-definitions="true"',
  'data-math-schema="mha"',
  'data-math-schema="gqa"',
  ...MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  ...MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
] as const;

export const GROUPED_QUERY_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS =
  MODULE_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS;

export const GROUPED_QUERY_ATTENTION_GRAPH_THEME_MARKERS = [
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
] as const;

export const GROUPED_QUERY_ATTENTION_GRAPH_INTERACTION_MARKERS = [
  'data-graph-interaction-pan="true"',
  'data-graph-interaction-zoom="true"',
  'data-graph-interaction-editing="false"',
] as const;

export const GROUPED_QUERY_ATTENTION_GRAPH_ACCESSIBILITY_MARKERS = [
  'role="img"',
  'data-graph-node-id="gqa-query-heads"',
  'data-graph-node-id="gqa-kv-groups"',
  'data-head-count-role="query"',
  'data-head-count-role="kv"',
] as const;

export const GROUPED_QUERY_ATTENTION_GRAPH_COMPARISON_MARKERS = [
  'data-attention-variant-comparison="true"',
  'data-attention-variant-active="gqa"',
  'data-attention-variant-option="mha"',
  'data-attention-variant-option="gqa"',
] as const;

function buildMathSchemaStub(
  schemaId: "mha" | "gqa",
  definitionIds: readonly string[],
): string {
  const definitions = definitionIds
    .map((id) => `<div data-math-variable-definition="${id}"></div>`)
    .join("");
  return `<div data-math-schema="${schemaId}" data-attention-schema-variable-definitions="true">${definitions}</div>`;
}

/** Stub HTML for the attention schema comparison block in math/schema sections. */
export function buildGroupedQueryAttentionMathComparisonStub(): string {
  return `<div data-attention-schema-comparison="true">
    ${buildMathSchemaStub("mha", MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS)}
    ${buildMathSchemaStub("gqa", MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS)}
    <span data-message-block-math="math.mhaSchema.formula"></span>
    <span data-message-block-math="math.gqaSchema.formula"></span>
    <span class="katex"></span>
  </div>`;
}

/** Minimal inner HTML that satisfies {@link assertGroupedQueryAttentionModuleConvergence}. */
export function buildGroupedQueryAttentionStubBody(): string {
  const graphWrapper = `<section id="how-it-works"><div data-attention-variant-comparison="true" data-attention-variant-active="gqa" data-attention-variant-option="mha" data-attention-variant-option="gqa" data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-gqa-comparison" data-graph-node-id="gqa-query-heads" data-graph-node-id="gqa-kv-groups" data-head-count-role="query" data-head-count-role="kv" data-graph-node-count="11" data-graph-interaction-pan="true" data-graph-interaction-zoom="true" data-graph-interaction-editing="false" role="img" aria-label="Multi-head attention versus grouped-query attention head-count comparison" data-manual-visibility-evidence="registry-graph-flow-node-contrast" style="--xy-background-color:var(--background);--xy-node-color:var(--foreground);--xy-node-background-color:var(--secondary);--xy-node-border-color:var(--border)"></div></section>`;
  const tagPillList = `<ul data-testid="tag-pill-list" aria-label="Tags"></ul>`;
  const mathDefinitions = buildGroupedQueryAttentionMathComparisonStub();

  const staticMarkers = GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS.filter(
    (marker) =>
      !marker.startsWith("data-math-schema=") &&
      !marker.startsWith("data-math-variable-definition=") &&
      marker !== 'data-attention-schema-variable-definitions="true"' &&
      marker !== 'data-react-flow-graph="true"' &&
      marker !==
        'data-graph-id="graph.grouped-query-attention-gqa-comparison"' &&
      marker !== 'data-attention-variant-comparison="true"' &&
      marker !== 'data-attention-variant-active="gqa"' &&
      marker !== 'data-attention-variant-option="mha"' &&
      marker !== 'data-attention-variant-option="gqa"' &&
      marker !== 'data-graph-node-id="gqa-query-heads"' &&
      marker !== 'data-graph-node-id="gqa-kv-groups"' &&
      marker !== 'data-head-count-role="query"' &&
      marker !== 'data-head-count-role="kv"' &&
      marker !== 'data-graph-node-count="11"' &&
      marker !== 'data-testid="tag-pill-list"' &&
      marker !== "--xy-node-color" &&
      marker !== "--xy-node-background-color" &&
      marker !==
        'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
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

  return [graphWrapper, tagPillList, mathDefinitions, ...renderedMarkers].join(
    "",
  );
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
    "symbol-level math variable definitions missing from schema section",
  forbiddenMathDefinitionTerms:
    "forbidden projection or grouping definition rows in math section",
  missingGraphInteractionMarkers:
    "React Flow graph wrapper missing pan, zoom, or editing interaction markers",
  missingGraphAccessibilityMarkers:
    "React Flow graph wrapper missing accessible labeling or head-count fallbacks",
  missingGraphComparisonMarkers:
    "attention variant comparison switcher or head-count markers missing from teaching graph",
  missingGraphAriaLabel:
    "React Flow graph wrapper missing non-empty aria-label",
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

function extractMathOrComputeSchemaSection(html: string): string {
  const match = /<section[^>]*\bid="math-or-compute-schema"[^>]*>/i.exec(html);
  if (!match || match.index === undefined) {
    const comparisonStart = html.indexOf(
      'data-attention-schema-comparison="true"',
    );
    return comparisonStart >= 0 ? html.slice(comparisonStart) : html;
  }

  const startIndex = match.index;
  let depth = 1;
  let pos = match.index + match[0].length;

  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<section", pos);
    const nextClose = html.indexOf("</section>", pos);

    if (nextClose === -1) {
      break;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + "<section".length;
    } else {
      depth--;
      pos = nextClose + "</section>".length;
      if (depth === 0) {
        return html.slice(startIndex, pos);
      }
    }
  }

  return html.slice(startIndex);
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
 * Returns a failure reason when pan/zoom interaction markers are absent from
 * the graph wrapper or editing remains enabled.
 */
export function assertGroupedQueryAttentionGraphInteractionConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    GROUPED_QUERY_ATTENTION_GRAPH_INTERACTION_MARKERS,
  );
  if (missing) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingGraphInteractionMarkers;
  }

  return null;
}

/**
 * Returns a failure reason when accessible graph labeling or sr-only node
 * fallbacks are missing from the teaching graph.
 */
export function assertGroupedQueryAttentionGraphAccessibilityConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    GROUPED_QUERY_ATTENTION_GRAPH_ACCESSIBILITY_MARKERS,
  );
  if (missing) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingGraphAccessibilityMarkers;
  }

  if (
    !/\bdata-react-flow-graph="true"[^>]*\baria-label="[^"]+"/.test(html) &&
    !/\baria-label="[^"]+"[^>]*\bdata-react-flow-graph="true"/.test(html)
  ) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingGraphAriaLabel;
  }

  return null;
}

/**
 * Returns a failure reason when the MHA/GQA comparison switcher or head-count
 * teaching markers are absent from the How It Works graph region.
 */
export function assertGroupedQueryAttentionGraphComparisonConvergence(
  html: string,
): string | null {
  const howItWorksSection = extractSectionHtml(html, "how-it-works");
  const region = howItWorksSection.length > 0 ? howItWorksSection : html;

  const missing = requireSubstrings(
    region,
    GROUPED_QUERY_ATTENTION_GRAPH_COMPARISON_MARKERS,
  );
  if (missing) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingGraphComparisonMarkers;
  }

  return null;
}

function extractSectionHtml(html: string, sectionId: string): string {
  const openTag = new RegExp(
    `<section[^>]*\\bid="${escapeRegExp(sectionId)}"[^>]*>`,
    "i",
  );
  const match = openTag.exec(html);
  if (!match || match.index === undefined) {
    return "";
  }

  const startIndex = match.index;
  let depth = 1;
  let pos = match.index + match[0].length;

  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<section", pos);
    const nextClose = html.indexOf("</section>", pos);

    if (nextClose === -1) {
      break;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + "<section".length;
    } else {
      depth--;
      pos = nextClose + "</section>".length;
      if (depth === 0) {
        return html.slice(startIndex, pos);
      }
    }
  }

  return "";
}

/**
 * Returns a failure reason when symbol-level math variable definitions are
 * missing from the attention schema comparison region or when forbidden concept
 * rows appear under the math block.
 */
export function assertGroupedQueryAttentionMathDefinitionsConvergence(
  html: string,
): string | null {
  const mathRegion = extractMathOrComputeSchemaSection(html);

  const missing = requireSubstrings(mathRegion, [
    'data-attention-schema-comparison="true"',
    'data-attention-schema-variable-definitions="true"',
    'data-math-schema="mha"',
    'data-math-schema="gqa"',
    'data-message-block-math="math.mhaSchema.formula"',
    'data-message-block-math="math.gqaSchema.formula"',
    ...MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS.map(
      (id) => `data-math-variable-definition="${id}"`,
    ),
    ...MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS.map(
      (id) => `data-math-variable-definition="${id}"`,
    ),
  ]);
  if (missing) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingMathDefinitions;
  }

  const forbidden = forbidSubstrings(
    mathRegion,
    GROUPED_QUERY_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS,
  );
  if (forbidden) {
    return GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.forbiddenMathDefinitionTerms;
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

const GROUPED_QUERY_ATTENTION_COMPANION_MARKERS = [
  'href="/docs/modules/attention"',
  'data-testid="curated-related-docs"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.grouped-query-attention-comparison"',
  'id="compared-to-nearby-modules"',
  'id="related"',
] as const;

/**
 * Returns a failure reason when attention bridge, comparison table, or curated
 * related docs are missing from the GQA module page.
 */
export function assertGroupedQueryAttentionCompanionSectionsConvergence(
  html: string,
): string | null {
  return requireSubstrings(html, GROUPED_QUERY_ATTENTION_COMPANION_MARKERS);
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
