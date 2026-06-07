/** React Flow node theme tokens applied on registry graph wrappers. */
export const REGISTRY_GRAPH_FLOW_NODE_THEME = {
  nodeColor: "var(--card-foreground)",
  nodeBackgroundColor: "var(--card)",
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
    '[data-react-flow-graph="true"][data-graph-id="graph.grouped-query-attention-compute-flow"]',
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

export function buildRegistryGraphFlowNodeThemeStyle(): Record<string, string> {
  return {
    "--xy-node-color": REGISTRY_GRAPH_FLOW_NODE_THEME.nodeColor,
    "--xy-node-background-color":
      REGISTRY_GRAPH_FLOW_NODE_THEME.nodeBackgroundColor,
  };
}
