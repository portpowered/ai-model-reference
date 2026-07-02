export const LOOPED_TRANSFORMERS_MODULE_TITLE = "Looped Transformers" as const;

export const LOOPED_TRANSFORMERS_ROUTE =
  "/docs/modules/looped-transformers" as const;

export const LOOPED_TRANSFORMERS_REGISTRY_ID =
  "module.looped-transformers" as const;

export const LOOPED_TRANSFORMERS_GRAPH_ID =
  "graph.looped-transformers-compute-flow" as const;

export const LOOPED_TRANSFORMERS_ICLR_CITATION_ID =
  "citation.looped-transformers-iclr-2024" as const;

const STANDARD_STACK_MATH_VARIABLE_DEFINITION_IDS = [
  "h",
  "l",
  "L",
  "blockl",
] as const;

const LOOPED_BLOCK_MATH_VARIABLE_DEFINITION_IDS = [
  "h",
  "ell",
  "L",
  "block",
] as const;

const LOOPED_PREDICTION_MATH_VARIABLE_DEFINITION_IDS = [
  "yhat",
  "head",
  "hL",
] as const;

/** Stable markers for looped-transformers module page convergence. */
export const LOOPED_TRANSFORMERS_REQUIRED_MARKERS = [
  LOOPED_TRANSFORMERS_MODULE_TITLE,
  `data-registry-id="${LOOPED_TRANSFORMERS_REGISTRY_ID}"`,
  "At a glance",
  'data-testid="tag-pill-list"',
  "Compared To Nearby Modules",
  'id="compared-to-nearby-modules"',
  "Related",
  'id="related"',
  'data-testid="curated-related-docs"',
  'data-react-flow-graph="true"',
  `data-graph-id="${LOOPED_TRANSFORMERS_GRAPH_ID}"`,
  'data-graph-node-id="input-context"',
  'data-graph-node-id="loop-counter"',
  'data-graph-node-id="shared-transformer-block"',
  'data-graph-node-id="hidden-state-update"',
  'data-graph-node-id="final-prediction"',
  'data-graph-edge-id="hidden-loop-back"',
  'data-graph-node-count="6"',
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
  'href="/docs/concepts/transformer-architecture"',
  'href="/docs/modules/attention"',
  'href="/docs/modules/feed-forward-network"',
  'data-prose-auto-link="true"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.looped-transformers-comparison"',
  'data-attention-schema-comparison="true"',
  'data-math-schema="standardStack"',
  'data-math-schema="loopedBlock"',
  'data-math-schema="loopedPrediction"',
  'data-message-block-math="math.standardStackSchema.formula"',
  'data-message-block-math="math.loopedBlockSchema.formula"',
  'data-message-block-math="math.loopedPredictionSchema.formula"',
  'class="katex"',
  "katex-display",
  'data-attention-schema-variable-definitions="true"',
  ...STANDARD_STACK_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  ...LOOPED_BLOCK_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  ...LOOPED_PREDICTION_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  'data-testid="citation-list"',
  'href="https://arxiv.org/abs/2311.12424"',
  "Looped transformer compute flow",
  "Loop count L",
  "Shared transformer block (attention + feed-forward)",
] as const;

export const LOOPED_TRANSFORMERS_GRAPH_THEME_MARKERS = [
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
] as const;

export const LOOPED_TRANSFORMERS_GRAPH_INTERACTION_MARKERS = [
  'data-graph-interaction-pan="true"',
  'data-graph-interaction-zoom="true"',
  'data-graph-interaction-editing="false"',
] as const;

export const LOOPED_TRANSFORMERS_GRAPH_ACCESSIBILITY_MARKERS = [
  'role="img"',
  'data-graph-node-id="input-context"',
  'data-graph-node-id="shared-transformer-block"',
] as const;

export const LOOPED_TRANSFORMERS_RESPONSIVE_MARKERS = [
  "registry-graph-flow w-full min-w-0",
  "registry-graph-flow__viewport",
  "max-w-full overflow-hidden",
] as const;

export const LOOPED_TRANSFORMERS_FORBIDDEN_MARKERS = [
  "TODO",
  "__MISSING",
  "Reader Shortcut",
  'data-testid="derived-related-docs"',
  'aria-label="Module metadata"',
] as const;

export const LOOPED_TRANSFORMERS_CONVERGENCE_REASONS = {
  duplicateBodyTitle:
    "duplicate Looped Transformers h1 in module body or shell",
  moduleMetadataCard: "module metadata card still present",
  duplicateTagPillList: "duplicate tag pill list surfaces",
  missingTagPillList: "tag pill list marker missing from module page",
  duplicateReactFlowGraph: "multiple React Flow graph canvases on module page",
  missingReactFlowGraph: "React Flow graph canvas missing from module page",
  missingThemedNodeColors:
    "React Flow node theme CSS variables missing from graph wrapper",
  missingGraphInteractionMarkers:
    "graph pan/zoom interaction markers missing from graph wrapper",
  missingGraphAccessibilityMarkers: "accessible graph labeling markers missing",
  missingGraphAriaLabel: "graph wrapper missing aria-label",
  missingResponsiveMarkers:
    "responsive graph shell markers missing from module page",
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

function buildMathSchemaStub(
  schemaId: "standardStack" | "loopedBlock" | "loopedPrediction",
  definitionIds: readonly string[],
): string {
  const definitions = definitionIds
    .map((id) => `<div data-math-variable-definition="${id}"></div>`)
    .join("");
  return `<div data-math-schema="${schemaId}" data-attention-schema-variable-definitions="true">${definitions}</div>`;
}

export function assertLoopedTransformersTitleConvergence(
  html: string,
): string | null {
  if (countH1BlocksContaining(html, LOOPED_TRANSFORMERS_MODULE_TITLE) > 1) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.duplicateBodyTitle;
  }

  return null;
}

export function assertLoopedTransformersChromeConvergence(
  html: string,
): string | null {
  if (html.includes('aria-label="Module metadata"')) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.moduleMetadataCard;
  }

  const tagPillCount = countMarkerOccurrences(
    html,
    'data-testid="tag-pill-list"',
  );
  if (tagPillCount === 0) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.missingTagPillList;
  }
  if (tagPillCount > 1) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.duplicateTagPillList;
  }

  return assertLoopedTransformersTitleConvergence(html);
}

export function assertLoopedTransformersSingleGraphConvergence(
  html: string,
): string | null {
  const graphCount = countMarkerOccurrences(
    html,
    'data-react-flow-graph="true"',
  );
  if (graphCount === 0) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.missingReactFlowGraph;
  }
  if (graphCount > 1) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.duplicateReactFlowGraph;
  }

  return null;
}

export function assertLoopedTransformersGraphThemeConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    LOOPED_TRANSFORMERS_GRAPH_THEME_MARKERS,
  );
  if (missing) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.missingThemedNodeColors;
  }

  return null;
}

export function assertLoopedTransformersGraphInteractionConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    LOOPED_TRANSFORMERS_GRAPH_INTERACTION_MARKERS,
  );
  if (missing) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.missingGraphInteractionMarkers;
  }

  return null;
}

export function assertLoopedTransformersGraphAccessibilityConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    LOOPED_TRANSFORMERS_GRAPH_ACCESSIBILITY_MARKERS,
  );
  if (missing) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.missingGraphAccessibilityMarkers;
  }

  if (
    !/\bdata-react-flow-graph="true"[^>]*\baria-label="[^"]+"/.test(html) &&
    !/\baria-label="[^"]+"[^>]*\bdata-react-flow-graph="true"/.test(html)
  ) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.missingGraphAriaLabel;
  }

  return null;
}

export function assertLoopedTransformersResponsiveConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    LOOPED_TRANSFORMERS_RESPONSIVE_MARKERS,
  );
  if (missing) {
    return LOOPED_TRANSFORMERS_CONVERGENCE_REASONS.missingResponsiveMarkers;
  }

  return null;
}

/** Minimal inner HTML that satisfies {@link assertLoopedTransformersModuleConvergence}. */
export function buildLoopedTransformersStubBody(): string {
  const graphWrapper = `<div data-react-flow-graph="true" role="img" aria-label="Looped transformer compute flow" data-graph-id="${LOOPED_TRANSFORMERS_GRAPH_ID}" data-graph-node-id="input-context" data-graph-node-id="loop-counter" data-graph-node-id="shared-transformer-block" data-graph-node-id="hidden-state-update" data-graph-node-id="final-prediction" data-graph-edge-id="hidden-loop-back" data-graph-node-count="6" data-graph-interaction-pan="true" data-graph-interaction-zoom="true" data-graph-interaction-editing="false" data-manual-visibility-evidence="registry-graph-flow-node-contrast" class="registry-graph-flow w-full min-w-0"><div class="registry-graph-flow__viewport max-w-full overflow-hidden" style="--xy-background-color:#ffffff;--xy-node-color:#111827;--xy-node-background-color:#ffffff;--xy-node-border-color:#cbd5e1"></div></div>`;
  const tagPillList = `<ul data-testid="tag-pill-list" aria-label="Tags"></ul>`;
  const mathDefinitions = `<div data-attention-schema-comparison="true">
    ${buildMathSchemaStub("standardStack", STANDARD_STACK_MATH_VARIABLE_DEFINITION_IDS)}
    ${buildMathSchemaStub("loopedBlock", LOOPED_BLOCK_MATH_VARIABLE_DEFINITION_IDS)}
    ${buildMathSchemaStub("loopedPrediction", LOOPED_PREDICTION_MATH_VARIABLE_DEFINITION_IDS)}
    <span data-message-block-math="math.standardStackSchema.formula"></span>
    <span data-message-block-math="math.loopedBlockSchema.formula"></span>
    <span data-message-block-math="math.loopedPredictionSchema.formula"></span>
    <span class="katex"></span>
    <span class="katex-display"></span>
  </div>`;

  const staticMarkers = LOOPED_TRANSFORMERS_REQUIRED_MARKERS.filter(
    (marker) =>
      !marker.startsWith("data-math-schema=") &&
      !marker.startsWith("data-math-variable-definition=") &&
      marker !== 'data-attention-schema-variable-definitions="true"' &&
      marker !== 'data-react-flow-graph="true"' &&
      marker !== `data-graph-id="${LOOPED_TRANSFORMERS_GRAPH_ID}"` &&
      marker !== 'data-graph-node-id="input-context"' &&
      marker !== 'data-graph-node-id="loop-counter"' &&
      marker !== 'data-graph-node-id="shared-transformer-block"' &&
      marker !== 'data-graph-node-id="hidden-state-update"' &&
      marker !== 'data-graph-node-id="final-prediction"' &&
      marker !== 'data-graph-edge-id="hidden-loop-back"' &&
      marker !== 'data-graph-node-count="6"' &&
      marker !== 'data-testid="tag-pill-list"' &&
      marker !== "--xy-node-color" &&
      marker !== "--xy-node-background-color" &&
      marker !==
        'data-manual-visibility-evidence="registry-graph-flow-node-contrast"' &&
      marker !== 'class="katex"' &&
      marker !== "katex-display",
  );

  const renderedMarkers = staticMarkers.map((marker) => {
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
 * Returns the first looped-transformers module page content failure
 * reason, or null when HTML includes converged markers and excludes stubs.
 */
export function assertLoopedTransformersModuleConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(html, LOOPED_TRANSFORMERS_REQUIRED_MARKERS);
  if (missing) {
    return missing;
  }

  const forbidden = forbidSubstrings(
    html,
    LOOPED_TRANSFORMERS_FORBIDDEN_MARKERS,
  );
  if (forbidden) {
    return forbidden;
  }

  for (const assert of [
    assertLoopedTransformersChromeConvergence,
    assertLoopedTransformersSingleGraphConvergence,
    assertLoopedTransformersGraphThemeConvergence,
    assertLoopedTransformersGraphInteractionConvergence,
    assertLoopedTransformersGraphAccessibilityConvergence,
    assertLoopedTransformersResponsiveConvergence,
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
