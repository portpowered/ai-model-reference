export const DIFFUSION_TRANSFORMER_BLOCK_MODULE_TITLE =
  "Diffusion Transformer Block" as const;

export const DIFFUSION_TRANSFORMER_BLOCK_ROUTE =
  "/docs/modules/diffusion-transformer-block" as const;

export const DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID =
  "module.diffusion-transformer-block" as const;

export const DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ID =
  "graph.diffusion-transformer-block-compute-flow" as const;

export const DIFFUSION_TRANSFORMER_BLOCK_DIT_CITATION_ID =
  "citation.scalable-diffusion-models-with-transformers" as const;

const GENERIC_BLOCK_MATH_VARIABLE_DEFINITION_IDS = [
  "x",
  "xprime",
  "norm",
  "attn",
  "ffn",
] as const;

const DIT_BLOCK_MATH_VARIABLE_DEFINITION_IDS = [
  "x",
  "ct",
  "c",
  "norm",
  "mod",
  "attn",
  "ffn",
] as const;

/** Stable markers for diffusion-transformer-block module page convergence. */
export const DIFFUSION_TRANSFORMER_BLOCK_REQUIRED_MARKERS = [
  DIFFUSION_TRANSFORMER_BLOCK_MODULE_TITLE,
  `data-registry-id="${DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID}"`,
  "At a glance",
  'data-testid="tag-pill-list"',
  "Compared To Nearby Modules",
  'id="compared-to-nearby-modules"',
  "Related",
  'id="related"',
  'data-testid="curated-related-docs"',
  'data-react-flow-graph="true"',
  `data-graph-id="${DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ID}"`,
  'data-graph-node-id="noisy-patch-tokens"',
  'data-graph-node-id="timestep-signal"',
  'data-graph-node-id="optional-conditioning"',
  'data-graph-node-id="self-attention"',
  'data-graph-node-id="residual-output"',
  'data-graph-node-count="8"',
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
  'href="/docs/concepts/transformer-architecture"',
  'href="/docs/modules/attention"',
  'href="/docs/glossary/denoising-generation"',
  'data-prose-auto-link="true"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.diffusion-transformer-block-comparison"',
  'data-attention-schema-comparison="true"',
  'data-math-schema="genericBlock"',
  'data-math-schema="ditBlock"',
  'data-message-block-math="math.genericBlockSchema.formula"',
  'data-message-block-math="math.ditBlockSchema.formula"',
  'class="katex"',
  "katex-display",
  'data-attention-schema-variable-definitions="true"',
  ...GENERIC_BLOCK_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  ...DIT_BLOCK_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  'data-testid="citation-list"',
  'href="https://arxiv.org/abs/2212.09748"',
  "Diffusion Transformer block compute flow",
  "Timestep and conditioning steering",
] as const;

export const DIFFUSION_TRANSFORMER_BLOCK_GRAPH_THEME_MARKERS = [
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
] as const;

export const DIFFUSION_TRANSFORMER_BLOCK_GRAPH_INTERACTION_MARKERS = [
  'data-graph-interaction-pan="true"',
  'data-graph-interaction-zoom="true"',
  'data-graph-interaction-editing="false"',
] as const;

export const DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ACCESSIBILITY_MARKERS = [
  'role="img"',
  'data-graph-node-id="noisy-patch-tokens"',
  'data-graph-node-id="timestep-signal"',
] as const;

export const DIFFUSION_TRANSFORMER_BLOCK_RESPONSIVE_MARKERS = [
  "registry-graph-flow w-full min-w-0",
  "registry-graph-flow__viewport",
  "max-w-full overflow-hidden",
] as const;

export const DIFFUSION_TRANSFORMER_BLOCK_FORBIDDEN_MARKERS = [
  "TODO",
  "__MISSING",
  "Reader Shortcut",
  'data-testid="derived-related-docs"',
  'aria-label="Module metadata"',
] as const;

export const DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS = {
  duplicateBodyTitle:
    "duplicate Diffusion Transformer Block h1 in module body or shell",
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
  schemaId: "genericBlock" | "ditBlock",
  definitionIds: readonly string[],
): string {
  const definitions = definitionIds
    .map((id) => `<div data-math-variable-definition="${id}"></div>`)
    .join("");
  return `<div data-math-schema="${schemaId}" data-attention-schema-variable-definitions="true">${definitions}</div>`;
}

export function assertDiffusionTransformerBlockTitleConvergence(
  html: string,
): string | null {
  if (
    countH1BlocksContaining(html, DIFFUSION_TRANSFORMER_BLOCK_MODULE_TITLE) > 1
  ) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.duplicateBodyTitle;
  }

  return null;
}

export function assertDiffusionTransformerBlockChromeConvergence(
  html: string,
): string | null {
  if (html.includes('aria-label="Module metadata"')) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.moduleMetadataCard;
  }

  const tagPillCount = countMarkerOccurrences(
    html,
    'data-testid="tag-pill-list"',
  );
  if (tagPillCount === 0) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.missingTagPillList;
  }
  if (tagPillCount > 1) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.duplicateTagPillList;
  }

  return assertDiffusionTransformerBlockTitleConvergence(html);
}

export function assertDiffusionTransformerBlockSingleGraphConvergence(
  html: string,
): string | null {
  const graphCount = countMarkerOccurrences(
    html,
    'data-react-flow-graph="true"',
  );
  if (graphCount === 0) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.missingReactFlowGraph;
  }
  if (graphCount > 1) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.duplicateReactFlowGraph;
  }

  return null;
}

export function assertDiffusionTransformerBlockGraphThemeConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    DIFFUSION_TRANSFORMER_BLOCK_GRAPH_THEME_MARKERS,
  );
  if (missing) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.missingThemedNodeColors;
  }

  return null;
}

export function assertDiffusionTransformerBlockGraphInteractionConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    DIFFUSION_TRANSFORMER_BLOCK_GRAPH_INTERACTION_MARKERS,
  );
  if (missing) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.missingGraphInteractionMarkers;
  }

  return null;
}

export function assertDiffusionTransformerBlockGraphAccessibilityConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ACCESSIBILITY_MARKERS,
  );
  if (missing) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.missingGraphAccessibilityMarkers;
  }

  if (
    !/\bdata-react-flow-graph="true"[^>]*\baria-label="[^"]+"/.test(html) &&
    !/\baria-label="[^"]+"[^>]*\bdata-react-flow-graph="true"/.test(html)
  ) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.missingGraphAriaLabel;
  }

  return null;
}

export function assertDiffusionTransformerBlockResponsiveConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    DIFFUSION_TRANSFORMER_BLOCK_RESPONSIVE_MARKERS,
  );
  if (missing) {
    return DIFFUSION_TRANSFORMER_BLOCK_CONVERGENCE_REASONS.missingResponsiveMarkers;
  }

  return null;
}

/** Minimal inner HTML that satisfies {@link assertDiffusionTransformerBlockModuleConvergence}. */
export function buildDiffusionTransformerBlockStubBody(): string {
  const graphWrapper = `<div data-react-flow-graph="true" role="img" aria-label="Diffusion Transformer block compute flow" data-graph-id="${DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ID}" data-graph-node-id="noisy-patch-tokens" data-graph-node-id="timestep-signal" data-graph-node-id="optional-conditioning" data-graph-node-id="self-attention" data-graph-node-id="residual-output" data-graph-node-count="8" data-graph-interaction-pan="true" data-graph-interaction-zoom="true" data-graph-interaction-editing="false" data-manual-visibility-evidence="registry-graph-flow-node-contrast" class="registry-graph-flow w-full min-w-0"><div class="registry-graph-flow__viewport max-w-full overflow-hidden" style="--xy-background-color:#ffffff;--xy-node-color:#111827;--xy-node-background-color:#ffffff;--xy-node-border-color:#cbd5e1"></div></div>`;
  const tagPillList = `<ul data-testid="tag-pill-list" aria-label="Tags"></ul>`;
  const mathDefinitions = `<div data-attention-schema-comparison="true">
    ${buildMathSchemaStub("genericBlock", GENERIC_BLOCK_MATH_VARIABLE_DEFINITION_IDS)}
    ${buildMathSchemaStub("ditBlock", DIT_BLOCK_MATH_VARIABLE_DEFINITION_IDS)}
    <span data-message-block-math="math.genericBlockSchema.formula"></span>
    <span data-message-block-math="math.ditBlockSchema.formula"></span>
    <span class="katex"></span>
    <span class="katex-display"></span>
  </div>`;

  const staticMarkers = DIFFUSION_TRANSFORMER_BLOCK_REQUIRED_MARKERS.filter(
    (marker) =>
      !marker.startsWith("data-math-schema=") &&
      !marker.startsWith("data-math-variable-definition=") &&
      marker !== 'data-attention-schema-variable-definitions="true"' &&
      marker !== 'data-react-flow-graph="true"' &&
      marker !== `data-graph-id="${DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ID}"` &&
      marker !== 'data-graph-node-id="noisy-patch-tokens"' &&
      marker !== 'data-graph-node-id="timestep-signal"' &&
      marker !== 'data-graph-node-id="optional-conditioning"' &&
      marker !== 'data-graph-node-id="self-attention"' &&
      marker !== 'data-graph-node-id="residual-output"' &&
      marker !== 'data-graph-node-count="8"' &&
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
 * Returns the first diffusion-transformer-block module page content failure
 * reason, or null when HTML includes converged markers and excludes stubs.
 */
export function assertDiffusionTransformerBlockModuleConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(
    html,
    DIFFUSION_TRANSFORMER_BLOCK_REQUIRED_MARKERS,
  );
  if (missing) {
    return missing;
  }

  const forbidden = forbidSubstrings(
    html,
    DIFFUSION_TRANSFORMER_BLOCK_FORBIDDEN_MARKERS,
  );
  if (forbidden) {
    return forbidden;
  }

  for (const assert of [
    assertDiffusionTransformerBlockChromeConvergence,
    assertDiffusionTransformerBlockSingleGraphConvergence,
    assertDiffusionTransformerBlockGraphThemeConvergence,
    assertDiffusionTransformerBlockGraphInteractionConvergence,
    assertDiffusionTransformerBlockGraphAccessibilityConvergence,
    assertDiffusionTransformerBlockResponsiveConvergence,
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
