export const MULTI_TOKEN_PREDICTION_MODULE_TITLE =
  "Multi-Token Prediction" as const;

export const MULTI_TOKEN_PREDICTION_ROUTE =
  "/docs/modules/multi-token-prediction" as const;

export const MULTI_TOKEN_PREDICTION_REGISTRY_ID =
  "module.multi-token-prediction" as const;

export const MULTI_TOKEN_PREDICTION_CITATION_ID =
  "citation.multi-token-prediction-paper" as const;

const NEXT_TOKEN_MATH_VARIABLE_DEFINITION_IDS = [
  "xt",
  "ht",
  "xtplus1",
  "xprefix",
  "theta",
  "ptheta",
] as const;

const MTP_MATH_VARIABLE_DEFINITION_IDS = [
  "xt",
  "ht",
  "n",
  "k",
  "xtplusk",
  "xprefix",
  "theta",
  "ptheta",
] as const;

/** Stable markers for multi-token-prediction module page convergence. */
export const MULTI_TOKEN_PREDICTION_REQUIRED_MARKERS = [
  MULTI_TOKEN_PREDICTION_MODULE_TITLE,
  `data-registry-id="${MULTI_TOKEN_PREDICTION_REGISTRY_ID}"`,
  "At a glance",
  'data-testid="tag-pill-list"',
  "Compared To Nearby Modules",
  'id="compared-to-nearby-modules"',
  "Related",
  'id="related"',
  'data-testid="curated-related-docs"',
  'data-attention-variant-comparison="true"',
  'data-attention-variant-active="mtp"',
  'data-attention-variant-option="nextToken"',
  'data-attention-variant-option="mtp"',
  'data-graph-node-id="mtp-context"',
  'data-graph-node-id="mtp-hidden"',
  'data-graph-node-id="mtp-head-1"',
  'data-graph-node-id="mtp-target-n"',
  'data-graph-node-count="9"',
  'data-react-flow-graph="true"',
  'data-graph-id="graph.multi-token-prediction-mtp-comparison"',
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
  'href="/docs/training/pretraining"',
  'href="/docs/glossary/autoregressive-generation"',
  'href="/docs/systems/speculative-decoding"',
  'href="https://arxiv.org/abs/2404.19737"',
  'data-testid="citation-list"',
  'data-prose-auto-link="true"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.multi-token-prediction-comparison"',
  'data-attention-schema-comparison="true"',
  'data-math-schema="nextToken"',
  'data-math-schema="mtp"',
  'data-message-block-math="math.nextTokenSchema.formula"',
  'data-message-block-math="math.mtpSchema.formula"',
  'class="katex"',
  "katex-display",
  'data-attention-schema-variable-definitions="true"',
  ...NEXT_TOKEN_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  ...MTP_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
] as const;

export const MULTI_TOKEN_PREDICTION_GRAPH_THEME_MARKERS = [
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
] as const;

export const MULTI_TOKEN_PREDICTION_GRAPH_INTERACTION_MARKERS = [
  'data-graph-interaction-pan="true"',
  'data-graph-interaction-zoom="true"',
  'data-graph-interaction-editing="false"',
] as const;

export const MULTI_TOKEN_PREDICTION_GRAPH_ACCESSIBILITY_MARKERS = [
  'role="img"',
  'role="tablist"',
  'data-graph-node-id="mtp-context"',
  'data-graph-node-id="mtp-hidden"',
] as const;

export const MULTI_TOKEN_PREDICTION_GRAPH_COMPARISON_MARKERS = [
  'data-attention-variant-comparison="true"',
  'data-attention-variant-active="mtp"',
  'data-attention-variant-option="nextToken"',
  'data-attention-variant-option="mtp"',
] as const;

export const MULTI_TOKEN_PREDICTION_FORBIDDEN_MARKERS = [
  "TODO",
  "__MISSING",
  "Reader Shortcut",
  'data-testid="derived-related-docs"',
  'aria-label="Module metadata"',
] as const;

export const MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS = {
  duplicateBodyTitle:
    "duplicate Multi-Token Prediction h1 in module body or shell",
  moduleMetadataCard: "module metadata card still present",
  duplicateTagPillList: "duplicate tag pill list surfaces",
  missingTagPillList: "tag pill list marker missing from module page",
  duplicateReactFlowGraph: "multiple React Flow graph canvases on module page",
  missingReactFlowGraph: "React Flow graph canvas missing from module page",
  missingThemedNodeColors:
    "React Flow node theme CSS variables missing from graph wrapper",
  missingGraphInteractionMarkers:
    "graph pan/zoom interaction markers missing from graph wrapper",
  missingGraphAccessibilityMarkers:
    "accessible graph labeling or variant tablist markers missing",
  missingGraphAriaLabel: "graph wrapper missing aria-label",
  missingGraphComparisonMarkers:
    "next-token versus MTP comparison switcher markers missing",
} as const;

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

export function assertMultiTokenPredictionTitleConvergence(
  html: string,
): string | null {
  if (countH1BlocksContaining(html, MULTI_TOKEN_PREDICTION_MODULE_TITLE) > 1) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.duplicateBodyTitle;
  }

  return null;
}

export function assertMultiTokenPredictionChromeConvergence(
  html: string,
): string | null {
  if (html.includes('aria-label="Module metadata"')) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.moduleMetadataCard;
  }

  const tagPillCount = countMarkerOccurrences(
    html,
    'data-testid="tag-pill-list"',
  );
  if (tagPillCount === 0) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.missingTagPillList;
  }
  if (tagPillCount > 1) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.duplicateTagPillList;
  }

  return assertMultiTokenPredictionTitleConvergence(html);
}

export function assertMultiTokenPredictionSingleGraphConvergence(
  html: string,
): string | null {
  const graphCount = countMarkerOccurrences(
    html,
    'data-react-flow-graph="true"',
  );
  if (graphCount === 0) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.missingReactFlowGraph;
  }
  if (graphCount > 1) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.duplicateReactFlowGraph;
  }

  return null;
}

export function assertMultiTokenPredictionGraphThemeConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    MULTI_TOKEN_PREDICTION_GRAPH_THEME_MARKERS,
  );
  if (missing) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.missingThemedNodeColors;
  }

  return null;
}

export function assertMultiTokenPredictionGraphInteractionConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    MULTI_TOKEN_PREDICTION_GRAPH_INTERACTION_MARKERS,
  );
  if (missing) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.missingGraphInteractionMarkers;
  }

  return null;
}

export function assertMultiTokenPredictionGraphAccessibilityConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    MULTI_TOKEN_PREDICTION_GRAPH_ACCESSIBILITY_MARKERS,
  );
  if (missing) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.missingGraphAccessibilityMarkers;
  }

  if (
    !/\bdata-react-flow-graph="true"[^>]*\baria-label="[^"]+"/.test(html) &&
    !/\baria-label="[^"]+"[^>]*\bdata-react-flow-graph="true"/.test(html)
  ) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.missingGraphAriaLabel;
  }

  return null;
}

export function assertMultiTokenPredictionGraphComparisonConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    MULTI_TOKEN_PREDICTION_GRAPH_COMPARISON_MARKERS,
  );
  if (missing) {
    return MULTI_TOKEN_PREDICTION_CONVERGENCE_REASONS.missingGraphComparisonMarkers;
  }

  return null;
}

/** Minimal inner HTML that satisfies {@link assertMultiTokenPredictionModuleConvergence}. */
export function buildMultiTokenPredictionStubBody(): string {
  const graphWrapper = `<div data-attention-variant-comparison="true" data-attention-variant-active="mtp" data-attention-variant-option="nextToken" data-attention-variant-option="mtp" role="tablist" data-react-flow-graph="true" aria-label="Multi-token prediction comparison graph" data-graph-id="graph.multi-token-prediction-mtp-comparison" data-graph-node-id="mtp-context" data-graph-node-id="mtp-hidden" data-graph-node-id="mtp-head-1" data-graph-node-id="mtp-target-n" data-graph-node-count="9" data-graph-interaction-pan="true" data-graph-interaction-zoom="true" data-graph-interaction-editing="false" data-manual-visibility-evidence="registry-graph-flow-node-contrast" role="img" style="--xy-background-color:#ffffff;--xy-node-color:#111827;--xy-node-background-color:#ffffff;--xy-node-border-color:#cbd5e1"></div>`;
  const tagPillList = `<ul data-testid="tag-pill-list" aria-label="Tags"></ul>`;
  const mathDefinitions = `<div data-attention-schema-comparison="true" data-attention-schema-variable-definitions="true">
    <div data-math-schema="nextToken">${NEXT_TOKEN_MATH_VARIABLE_DEFINITION_IDS.map((id) => `<div data-math-variable-definition="${id}"></div>`).join("")}</div>
    <div data-math-schema="mtp">${MTP_MATH_VARIABLE_DEFINITION_IDS.map((id) => `<div data-math-variable-definition="${id}"></div>`).join("")}</div>
    <span data-message-block-math="math.nextTokenSchema.formula"></span>
    <span data-message-block-math="math.mtpSchema.formula"></span>
    <span class="katex"></span>
  </div>`;

  const staticMarkers = MULTI_TOKEN_PREDICTION_REQUIRED_MARKERS.filter(
    (marker) =>
      !marker.startsWith("data-math-schema=") &&
      !marker.startsWith("data-math-variable-definition=") &&
      marker !== 'data-attention-schema-variable-definitions="true"' &&
      marker !== 'data-react-flow-graph="true"' &&
      marker !==
        'data-graph-id="graph.multi-token-prediction-mtp-comparison"' &&
      marker !== 'data-attention-variant-comparison="true"' &&
      marker !== 'data-attention-variant-active="mtp"' &&
      marker !== 'data-attention-variant-option="nextToken"' &&
      marker !== 'data-attention-variant-option="mtp"' &&
      marker !== 'data-graph-node-id="mtp-context"' &&
      marker !== 'data-graph-node-id="mtp-hidden"' &&
      marker !== 'data-graph-node-id="mtp-head-1"' &&
      marker !== 'data-graph-node-id="mtp-target-n"' &&
      marker !== 'data-graph-node-count="9"' &&
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

/**
 * Returns the first multi-token-prediction module page content failure reason, or
 * null when HTML includes converged markers and excludes placeholder-only stubs.
 */
export function assertMultiTokenPredictionModuleConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    MULTI_TOKEN_PREDICTION_REQUIRED_MARKERS,
  );
  if (missing) {
    return missing;
  }

  const forbidden = forbidSubstrings(
    html,
    MULTI_TOKEN_PREDICTION_FORBIDDEN_MARKERS,
  );
  if (forbidden) {
    return forbidden;
  }

  for (const assert of [
    assertMultiTokenPredictionChromeConvergence,
    assertMultiTokenPredictionSingleGraphConvergence,
    assertMultiTokenPredictionGraphThemeConvergence,
    assertMultiTokenPredictionGraphInteractionConvergence,
    assertMultiTokenPredictionGraphAccessibilityConvergence,
    assertMultiTokenPredictionGraphComparisonConvergence,
  ]) {
    const failure = assert(html);
    if (failure) {
      return failure;
    }
  }

  if (html.toLowerCase().includes("lorem")) {
    return "placeholder lorem copy detected";
  }

  return null;
}
