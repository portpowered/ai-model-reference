import { MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS } from "@/features/models/components/module-attention-math-variable-definitions";

export const MAMBA_SELECTIVE_STATE_SPACE_MODULE_TITLE =
  "Mamba Selective State-Space Module" as const;

export const MAMBA_SELECTIVE_STATE_SPACE_ROUTE =
  "/docs/modules/mamba-selective-state-space" as const;

export const MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID =
  "module.mamba-selective-state-space" as const;

export const MAMBA_SELECTIVE_STATE_SPACE_CITATION_ID =
  "citation.mamba-selective-state-space-paper" as const;

export const MAMBA_SELECTIVE_STATE_SPACE_TABLE_ID =
  "table.mamba-selective-state-space-comparison" as const;

export const MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID =
  "graph.mamba-selective-state-space-state-flow" as const;

export const MAMBA_SELECTIVE_STATE_SPACE_SSM_MATH_VARIABLE_DEFINITION_IDS = [
  "ht",
  "htm1",
  "xt",
  "yt",
  "at",
  "bt",
  "ct",
  "t",
] as const;

/** Stable markers for mamba selective state-space graph and math convergence. */
export const MAMBA_SELECTIVE_STATE_SPACE_REQUIRED_MARKERS = [
  `data-registry-id="${MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID}"`,
  "At a glance",
  'data-testid="tag-pill-list"',
  'data-attention-variant-comparison="true"',
  'data-attention-variant-active="mamba"',
  'data-attention-variant-option="mha"',
  'data-attention-variant-option="mamba"',
  `data-graph-id="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
  `data-graph-title="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
  `data-graph-legend="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
  'data-graph-node-id="mamba-time-current-input"',
  'data-graph-node-id="mamba-time-selective-gate"',
  'data-graph-node-id="mamba-time-state-next"',
  'data-graph-edge-id="mamba-time-gate-to-state-next"',
  'data-head-count-role="query"',
  'data-head-count-role="kv"',
  'data-react-flow-graph="true"',
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
  "Sequence mixing over time",
  "Input-dependent update path",
  "State carried across steps",
  "Dense attention compares the current query against every past key position",
  'data-attention-schema-comparison="true"',
  'data-math-schema="mha"',
  'data-math-schema="ssm"',
  'data-message-block-math="math.mhaSchema.formula"',
  'data-message-block-math="math.ssmSchema.formula"',
  'data-attention-schema-variable-definitions="true"',
  ...MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
  ...MAMBA_SELECTIVE_STATE_SPACE_SSM_MATH_VARIABLE_DEFINITION_IDS.map(
    (id) => `data-math-variable-definition="${id}"`,
  ),
] as const;

export const MAMBA_SELECTIVE_STATE_SPACE_GRAPH_THEME_MARKERS = [
  "--xy-node-color",
  "--xy-node-background-color",
  'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
] as const;

export const MAMBA_SELECTIVE_STATE_SPACE_CONVERGENCE_REASONS = {
  duplicateReactFlowGraph: "multiple React Flow graph canvases on module page",
  missingReactFlowGraph: "React Flow graph canvas missing from module page",
  missingThemedNodeColors:
    "React Flow node theme CSS variables missing from graph wrapper",
  missingGraphTitle:
    "graph title marker missing from variant comparison figure",
  missingGraphLegend:
    "graph legend marker missing from variant comparison figure",
  missingMathDefinitions:
    "symbol-level math variable definitions missing from schema section",
} as const;

function countMarkerOccurrences(html: string, marker: string): number {
  return (
    html.match(
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    ) ?? []
  ).length;
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

export function assertMambaSelectiveStateSpaceGraphThemeConvergence(
  html: string,
): string | null {
  return requireSubstrings(
    html,
    MAMBA_SELECTIVE_STATE_SPACE_GRAPH_THEME_MARKERS,
  );
}

export function assertMambaSelectiveStateSpaceSingleGraphConvergence(
  html: string,
): string | null {
  const graphCount = countMarkerOccurrences(
    html,
    'data-react-flow-graph="true"',
  );
  if (graphCount === 0) {
    return MAMBA_SELECTIVE_STATE_SPACE_CONVERGENCE_REASONS.missingReactFlowGraph;
  }
  if (graphCount > 1) {
    return MAMBA_SELECTIVE_STATE_SPACE_CONVERGENCE_REASONS.duplicateReactFlowGraph;
  }
  return null;
}

export function assertMambaSelectiveStateSpaceGraphPresentationConvergence(
  html: string,
): string | null {
  if (
    !html.includes(`data-graph-title="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`)
  ) {
    return MAMBA_SELECTIVE_STATE_SPACE_CONVERGENCE_REASONS.missingGraphTitle;
  }
  if (
    !html.includes(
      `data-graph-legend="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
    )
  ) {
    return MAMBA_SELECTIVE_STATE_SPACE_CONVERGENCE_REASONS.missingGraphLegend;
  }
  return null;
}

export function assertMambaSelectiveStateSpaceMathDefinitionsConvergence(
  html: string,
): string | null {
  const mathSectionStart = html.indexOf('id="math-or-compute-schema"');
  const mathSection =
    mathSectionStart >= 0 ? html.slice(mathSectionStart) : html;

  if (
    !mathSection.includes('data-attention-schema-variable-definitions="true"')
  ) {
    return MAMBA_SELECTIVE_STATE_SPACE_CONVERGENCE_REASONS.missingMathDefinitions;
  }

  for (const id of MAMBA_SELECTIVE_STATE_SPACE_SSM_MATH_VARIABLE_DEFINITION_IDS) {
    if (!mathSection.includes(`data-math-variable-definition="${id}"`)) {
      return MAMBA_SELECTIVE_STATE_SPACE_CONVERGENCE_REASONS.missingMathDefinitions;
    }
  }

  return null;
}

export function assertMambaSelectiveStateSpaceModuleConvergence(
  html: string,
): string | null {
  return (
    requireSubstrings(html, MAMBA_SELECTIVE_STATE_SPACE_REQUIRED_MARKERS) ??
    assertMambaSelectiveStateSpaceSingleGraphConvergence(html) ??
    assertMambaSelectiveStateSpaceGraphThemeConvergence(html) ??
    assertMambaSelectiveStateSpaceGraphPresentationConvergence(html) ??
    assertMambaSelectiveStateSpaceMathDefinitionsConvergence(html)
  );
}
