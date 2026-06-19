import type { GraphRecord } from "@/lib/content/schemas";

export const GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  accent: "var(--accent)",
  border: "var(--border)",
  muted: "var(--muted)",
  destructive: "var(--destructive)",
} as const;

export const REGISTRY_GRAPH_FLOW_DEFAULT_SEMANTIC_TOKENS = {
  surface: "secondary",
  border: "border",
  text: "foreground",
  emphasis: "primary",
  comparison: "accent",
  muted: "muted",
  destructive: "destructive",
} as const;

/** React Flow node theme tokens applied on registry graph wrappers. */
export const REGISTRY_GRAPH_FLOW_NODE_THEME = {
  graphBackgroundColor: GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE.background,
  nodeColor:
    GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE[
      REGISTRY_GRAPH_FLOW_DEFAULT_SEMANTIC_TOKENS.text
    ],
  nodeBackgroundColor:
    GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE[
      REGISTRY_GRAPH_FLOW_DEFAULT_SEMANTIC_TOKENS.surface
    ],
  nodeBorderColor:
    GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE[
      REGISTRY_GRAPH_FLOW_DEFAULT_SEMANTIC_TOKENS.border
    ],
} as const;

/**
 * Stable hook for manual contrast checks when automated assertions cannot
 * inspect computed styles in CI.
 */
export const REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE =
  "registry-graph-flow-node-contrast" as const;

/**
 * Selectors future convergence runs can cite for manual node-label visibility
 * checks on the GQA compute-flow graph.
 */
export const REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS = {
  graphWrapper:
    '[data-attention-variant-comparison="true"] [data-react-flow-graph="true"]',
  themedWrapper: `[data-manual-visibility-evidence="${REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE}"]`,
  nodeLabels: ".registry-graph-flow .react-flow__node-default",
  srOnlyNodeLabels: ".registry-graph-flow [data-graph-node-id]",
} as const;

/** React Flow interaction flags: pan/zoom enabled, editing disabled. */
export const REGISTRY_GRAPH_FLOW_INTERACTION = {
  panOnDrag: true,
  zoomOnScroll: true,
  zoomOnPinch: true,
  zoomOnDoubleClick: true,
  nodesDraggable: false,
  nodesConnectable: false,
  elementsSelectable: false,
  preventScrolling: true,
} as const;

export function resolveGraphSemanticTokens(
  governance?: GraphRecord["governance"],
) {
  return {
    ...REGISTRY_GRAPH_FLOW_DEFAULT_SEMANTIC_TOKENS,
    ...governance?.semanticTokens,
  } as const;
}

export function buildRegistryGraphFlowNodeThemeStyle(
  graphRecord?: Pick<GraphRecord, "governance">,
): Record<string, string> {
  const semanticTokens = resolveGraphSemanticTokens(graphRecord?.governance);

  return {
    "--xy-background-color":
      REGISTRY_GRAPH_FLOW_NODE_THEME.graphBackgroundColor,
    "--xy-node-color": GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE[semanticTokens.text],
    "--xy-node-background-color":
      GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE[semanticTokens.surface],
    "--xy-node-border-color":
      GRAPH_SEMANTIC_TOKEN_CSS_VARIABLE[semanticTokens.border],
  };
}
