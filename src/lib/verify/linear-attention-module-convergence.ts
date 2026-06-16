import {
  MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_GQA_ONLY_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS,
  MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
} from "@/features/models/components/module-attention-math-variable-definitions";

export const LINEAR_ATTENTION_MODULE_TITLE = "Linear Attention" as const;

/** Stable markers for linear-attention module page convergence. */
export const LINEAR_ATTENTION_REQUIRED_MARKERS = [
  LINEAR_ATTENTION_MODULE_TITLE,
  'data-registry-id="module.linear-attention"',
  "At a glance",
  'data-testid="tag-pill-list"',
  "Compared To Nearby Modules",
  'id="compared-to-nearby-modules"',
  "Related",
  'id="related"',
  'data-testid="curated-related-docs"',
  'data-attention-variant-comparison="true"',
  'data-attention-variant-active="linear"',
  'data-attention-variant-option="mha"',
  'data-attention-variant-option="linear"',
  'data-graph-node-id="linear-query-heads"',
  'data-graph-node-id="linear-summary-node-1"',
  'data-head-count-role="query"',
  'data-head-count-role="kv"',
  'data-graph-node-count="11"',
  'data-react-flow-graph="true"',
  'data-graph-id="graph.linear-attention-linear-comparison"',
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
  'href="/docs/modules/multi-head-attention"',
  'href="/docs/modules/multi-query-attention"',
  'href="/docs/modules/grouped-query-attention"',
  'data-prose-auto-link="true"',
  'data-registry-comparison-table="true"',
  'data-table-id="table.linear-attention-comparison"',
  "Sequence scaling",
  'data-comparison-dimension="expressiveness"',
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

export const LINEAR_ATTENTION_MATH_DEFINITION_MARKERS = [
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

export const LINEAR_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS =
  MODULE_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS;

export const LINEAR_ATTENTION_GRAPH_THEME_MARKERS = [
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
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
export function buildLinearAttentionMathComparisonStub(): string {
  return `<div data-attention-schema-comparison="true">
    ${buildMathSchemaStub("mha", MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS)}
    ${buildMathSchemaStub("gqa", MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS)}
    <span data-message-block-math="math.mhaSchema.formula"></span>
    <span data-message-block-math="math.gqaSchema.formula"></span>
    <span class="katex"></span>
  </div>`;
}

/** Minimal inner HTML that satisfies {@link assertLinearAttentionModuleConvergence}. */
export function buildLinearAttentionStubBody(): string {
  const graphWrapper = `<div data-attention-variant-comparison="true" data-attention-variant-active="linear" data-attention-variant-option="mha" data-attention-variant-option="linear" data-react-flow-graph="true" data-graph-id="graph.linear-attention-linear-comparison" data-graph-node-id="linear-query-heads" data-graph-node-id="linear-summary-node-1" data-head-count-role="query" data-head-count-role="kv" data-graph-node-count="11" data-manual-visibility-evidence="registry-graph-flow-node-contrast" style="--xy-background-color:#ffffff;--xy-node-color:#111827;--xy-node-background-color:#ffffff;--xy-node-border-color:#cbd5e1"></div>`;
  const tagPillList = `<ul data-testid="tag-pill-list" aria-label="Tags"></ul>`;
  const mathDefinitions = buildLinearAttentionMathComparisonStub();

  const staticMarkers = LINEAR_ATTENTION_REQUIRED_MARKERS.filter(
    (marker) =>
      !marker.startsWith("data-math-schema=") &&
      !marker.startsWith("data-math-variable-definition=") &&
      marker !== 'data-attention-schema-variable-definitions="true"' &&
      marker !== 'data-react-flow-graph="true"' &&
      marker !== 'data-graph-id="graph.linear-attention-linear-comparison"' &&
      marker !== 'data-attention-variant-comparison="true"' &&
      marker !== 'data-attention-variant-active="linear"' &&
      marker !== 'data-attention-variant-option="mha"' &&
      marker !== 'data-attention-variant-option="linear"' &&
      marker !== 'data-graph-node-id="linear-query-heads"' &&
      marker !== 'data-graph-node-id="linear-summary-node-1"' &&
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

export const LINEAR_ATTENTION_FORBIDDEN_MARKERS = [
  "Variants And Nearby Modules",
  'data-testid="derived-related-docs"',
  'aria-label="Module metadata"',
] as const;

export const LINEAR_ATTENTION_CONVERGENCE_REASONS = {
  duplicateBodyTitle: "duplicate Linear Attention h1 in module body or shell",
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

export function assertLinearAttentionTitleConvergence(
  html: string,
): string | null {
  if (countH1BlocksContaining(html, LINEAR_ATTENTION_MODULE_TITLE) > 1) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.duplicateBodyTitle;
  }

  if (
    new RegExp(
      `<h1\\b[^>]*>\\s*${escapeRegExp(LINEAR_ATTENTION_MODULE_TITLE)}\\s*</h1>`,
      "i",
    ).test(html) &&
    html.includes('data-registry-id="module.linear-attention"')
  ) {
    const registryIndex = html.indexOf(
      'data-registry-id="module.linear-attention"',
    );
    const h1Index = html.search(
      new RegExp(
        `<h1\\b[^>]*>\\s*${escapeRegExp(LINEAR_ATTENTION_MODULE_TITLE)}\\s*</h1>`,
        "i",
      ),
    );
    if (h1Index >= registryIndex) {
      return LINEAR_ATTENTION_CONVERGENCE_REASONS.duplicateBodyTitle;
    }
  }

  return null;
}

export function assertLinearAttentionChromeConvergence(
  html: string,
): string | null {
  if (html.includes('aria-label="Module metadata"')) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.moduleMetadataCard;
  }

  const tagPillCount = countMarkerOccurrences(
    html,
    'data-testid="tag-pill-list"',
  );
  if (tagPillCount === 0) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.missingTagPillList;
  }
  if (tagPillCount > 1) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.duplicateTagPillList;
  }

  return assertLinearAttentionTitleConvergence(html);
}

export function assertLinearAttentionSingleGraphConvergence(
  html: string,
): string | null {
  const graphCount = countMarkerOccurrences(
    html,
    'data-react-flow-graph="true"',
  );
  if (graphCount === 0) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.missingReactFlowGraph;
  }
  if (graphCount > 1) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.duplicateReactFlowGraph;
  }

  return null;
}

export function assertLinearAttentionGraphThemeConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(html, LINEAR_ATTENTION_GRAPH_THEME_MARKERS);
  if (missing) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.missingThemedNodeColors;
  }

  return null;
}

export function assertLinearAttentionMathDefinitionsConvergence(
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
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.missingMathDefinitions;
  }

  const forbidden = forbidSubstrings(
    mathRegion,
    LINEAR_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS,
  );
  if (forbidden) {
    return LINEAR_ATTENTION_CONVERGENCE_REASONS.forbiddenMathDefinitionTerms;
  }

  return null;
}

/**
 * Returns the first linear-attention module page content failure reason, or null
 * when HTML includes converged markers and excludes placeholder-only stubs.
 */
export function assertLinearAttentionModuleConvergence(
  html: string,
): string | null {
  const missing = requireSubstrings(html, LINEAR_ATTENTION_REQUIRED_MARKERS);
  if (missing) {
    return missing;
  }

  const forbidden = forbidSubstrings(html, LINEAR_ATTENTION_FORBIDDEN_MARKERS);
  if (forbidden) {
    return forbidden;
  }

  const chrome = assertLinearAttentionChromeConvergence(html);
  if (chrome) {
    return chrome;
  }

  const singleGraph = assertLinearAttentionSingleGraphConvergence(html);
  if (singleGraph) {
    return singleGraph;
  }

  const theme = assertLinearAttentionGraphThemeConvergence(html);
  if (theme) {
    return theme;
  }

  const mathDefinitions = assertLinearAttentionMathDefinitionsConvergence(html);
  if (mathDefinitions) {
    return mathDefinitions;
  }

  if (html.toLowerCase().includes("lorem")) {
    return "placeholder lorem copy detected";
  }

  return null;
}
