import {
  type Edge,
  type EdgeMarker,
  MarkerType,
  type Node,
} from "@xyflow/react";
import type { CSSProperties } from "react";
import { lookupMessage } from "@/lib/content/messages";
import type {
  GraphRecord,
  ModuleGraphEdge,
  ModuleGraphNode,
  PageMessages,
} from "@/lib/content/schemas";

const NODE_X = 0;
const NODE_Y_GAP = 110;
const ROW_LABEL_X_OFFSET = -112;
const NODE_BOX_SAFETY_PADDING = 4;

export type RegistryFlowNodeData = {
  label: string;
  moduleKind: string;
  size?: { width: number; height: number };
  headCountRole?: "query" | "kv";
  visualRole?:
    | "row-label"
    | "query-head"
    | "key-head"
    | "value-head"
    | "timeline-node"
    | "timeline-node-muted"
    | "summary-node"
    | "process-node"
    | "moe-expert-node"
    | "moe-merge-node"
    | "latent-node"
    | "annotation"
    | "group-container"
    | "repeat-label"
    | "architecture-embedding"
    | "architecture-attention"
    | "architecture-feed-forward"
    | "architecture-add-norm"
    | "architecture-linear"
    | "architecture-softmax"
    | "architecture-io"
    | "operator-circle"
    | "default";
};

export class GraphRenderIssueError extends Error {
  readonly issues: string[];

  constructor(graphId: string, issues: string[]) {
    super(
      `Graph render validation failed for ${graphId}: ${issues.join("; ")}`,
    );
    this.name = "GraphRenderIssueError";
    this.issues = issues;
  }
}

type RegistryFlowNodeVisualRole = NonNullable<
  RegistryFlowNodeData["visualRole"]
>;

type NodeSizeEstimateConfig = {
  minWidth: number;
  fontSize: number;
  lineHeight: number;
  paddingX: number;
  paddingY: number;
  borderWidth: number;
};

export function resolveGraphNodeLabel(
  messages: PageMessages | readonly PageMessages[],
  labelKey: string,
): string {
  const sources = Array.isArray(messages) ? messages : [messages];
  for (const source of sources) {
    const result = lookupMessage(source, labelKey);
    if (result.ok) {
      return result.value;
    }
  }
  return labelKey;
}

function getNodeSizeEstimateConfig(
  visualRole: RegistryFlowNodeVisualRole,
): NodeSizeEstimateConfig | null {
  switch (visualRole) {
    case "annotation":
      return {
        minWidth: 0,
        fontSize: 20,
        lineHeight: 1.35,
        paddingX: 0,
        paddingY: 0,
        borderWidth: 0,
      };
    case "summary-node":
      return {
        minWidth: 116,
        fontSize: 14,
        lineHeight: 1.25,
        paddingX: 10,
        paddingY: 8,
        borderWidth: 2,
      };
    case "process-node":
    case "moe-expert-node":
    case "moe-merge-node":
      return {
        minWidth: 134,
        fontSize: 14,
        lineHeight: 1.25,
        paddingX: 10,
        paddingY: 8,
        borderWidth: 2,
      };
    case "latent-node":
      return {
        minWidth: 148,
        fontSize: 14,
        lineHeight: 1.25,
        paddingX: 10,
        paddingY: 8,
        borderWidth: 2,
      };
    case "default":
      return {
        minWidth: 0,
        fontSize: 13,
        lineHeight: 1.25,
        paddingX: 10,
        paddingY: 8,
        borderWidth: 1,
      };
    case "timeline-node":
    case "timeline-node-muted":
      return {
        minWidth: 84,
        fontSize: 13,
        lineHeight: 1.25,
        paddingX: 10,
        paddingY: 8,
        borderWidth: 1,
      };
    case "architecture-embedding":
    case "architecture-attention":
    case "architecture-feed-forward":
    case "architecture-add-norm":
    case "architecture-linear":
    case "architecture-softmax":
    case "architecture-io":
      return {
        minWidth: 0,
        fontSize: 15,
        lineHeight: 1.15,
        paddingX: 12,
        paddingY: 8,
        borderWidth: 3,
      };
    default:
      return null;
  }
}

function countWrappedTextLines(text: string, maxCharsPerLine: number): number {
  const explicitLines = text.split("\n");
  let total = 0;

  for (const explicitLine of explicitLines) {
    const trimmed = explicitLine.trim();
    if (trimmed.length === 0) {
      total += 1;
      continue;
    }
    total += Math.max(1, Math.ceil(trimmed.length / maxCharsPerLine));
  }

  return total;
}

export function estimateRegistryFlowNodeBoxSize(input: {
  label: string;
  visualRole?: RegistryFlowNodeData["visualRole"];
  requestedSize?: { width: number; height: number };
}): { width: number; height: number } | undefined {
  const visualRole = input.visualRole ?? "default";
  const config = getNodeSizeEstimateConfig(visualRole);

  if (!config) {
    return input.requestedSize;
  }

  const requestedWidth = input.requestedSize?.width ?? config.minWidth;
  const width = Math.max(requestedWidth, config.minWidth);
  const availableTextWidth = Math.max(
    1,
    width - config.paddingX * 2 - config.borderWidth * 2,
  );
  const averageCharacterWidth = config.fontSize * 0.56;
  const maxCharsPerLine = Math.max(
    1,
    Math.floor(availableTextWidth / averageCharacterWidth),
  );
  const lineCount = countWrappedTextLines(input.label, maxCharsPerLine);
  const contentHeight = Math.ceil(
    lineCount * config.fontSize * config.lineHeight +
      config.paddingY * 2 +
      config.borderWidth * 2 +
      NODE_BOX_SAFETY_PADDING,
  );
  const requestedHeight = input.requestedSize?.height ?? 0;

  return {
    width,
    height: Math.max(requestedHeight, contentHeight),
  };
}

export function orderGraphNodes(graph: GraphRecord): ModuleGraphNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const ordered: ModuleGraphNode[] = [];
  const seen = new Set<string>();

  function visit(nodeId: string) {
    if (seen.has(nodeId)) {
      return;
    }
    const node = byId.get(nodeId);
    if (!node) {
      return;
    }
    seen.add(nodeId);
    ordered.push(node);
    for (const childId of node.childNodeIds) {
      visit(childId);
    }
  }

  visit(graph.rootNodeId);

  for (const node of graph.nodes) {
    if (!seen.has(node.id)) {
      ordered.push(node);
    }
  }

  return ordered;
}

export function buildRegistryFlowEdges(graph: GraphRecord): Edge[] {
  if (graph.edges.length > 0) {
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: buildRegistryFlowEdgeType(edge),
      zIndex: buildRegistryFlowEdgeZIndex(edge),
      ...(edge.sourceHandleSide
        ? {
            sourceHandle: buildRegistryFlowHandleId(
              "source",
              edge.sourceHandleSide,
            ),
          }
        : {}),
      ...(edge.targetHandleSide
        ? {
            targetHandle: buildRegistryFlowHandleId(
              "target",
              edge.targetHandleSide,
            ),
          }
        : {}),
      markerEnd: buildRegistryFlowEdgeMarker(edge),
      style: buildRegistryFlowEdgeStyle(edge),
    }));
  }

  const edges: Edge[] = [];
  for (const node of graph.nodes) {
    for (const childId of node.childNodeIds) {
      edges.push({
        id: `${node.id}->${childId}`,
        source: node.id,
        target: childId,
        type: buildRegistryFlowEdgeType({ edgeKind: "data-flow" }),
        zIndex: buildRegistryFlowEdgeZIndex({ edgeKind: "data-flow" }),
        markerEnd: buildRegistryFlowEdgeMarker({ edgeKind: "data-flow" }),
        style: buildRegistryFlowEdgeStyle({ edgeKind: "data-flow" }),
      });
    }
  }
  return edges;
}

function buildRegistryFlowHandleId(
  type: "source" | "target",
  side: "top" | "right" | "bottom" | "left",
): string {
  return `${type}-${side}`;
}

function buildRegistryFlowEdgeZIndex(
  edge: Pick<ModuleGraphEdge, "edgeKind">,
): number {
  switch (edge.edgeKind) {
    case "contains":
      return 0;
    case "residual":
      return 2;
    default:
      return 2;
  }
}

function buildRegistryFlowEdgeType(
  edge: Pick<ModuleGraphEdge, "edgeKind">,
): Edge["type"] {
  switch (edge.edgeKind) {
    case "contains":
    case "control-flow":
    case "residual":
      return "smoothstep";
    default:
      return "straight";
  }
}

function buildRegistryFlowEdgeMarker(
  edge: Pick<ModuleGraphEdge, "edgeKind">,
): EdgeMarker {
  const color =
    edge.edgeKind === "cache-read" || edge.edgeKind === "cache-write"
      ? "#2563eb"
      : edge.edgeKind === "residual"
        ? "#7c3aed"
        : edge.edgeKind === "contains"
          ? "#334155"
          : "#111111";

  return {
    type: MarkerType.ArrowClosed,
    color,
    width: 12,
    height: 12,
  };
}

function buildRegistryFlowEdgeStyle(
  edge: Pick<ModuleGraphEdge, "edgeKind">,
): CSSProperties {
  switch (edge.edgeKind) {
    case "parameter-sharing":
      return {
        strokeWidth: 3,
        stroke: "#0f172a",
        strokeDasharray: "10 8",
      };
    case "cache-read":
    case "cache-write":
      return {
        strokeWidth: 3,
        stroke: "#2563eb",
      };
    case "residual":
      return {
        strokeWidth: 3,
        stroke: "#7c3aed",
      };
    case "contains":
      return {
        strokeWidth: 2.5,
        stroke: "#334155",
      };
    default:
      return {
        strokeWidth: 3,
        stroke: "#111111",
      };
  }
}

function validateRegistryFlowGraph(
  graph: GraphRecord,
  labelSources: readonly PageMessages[],
): void {
  const issues: string[] = [];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    const label = resolveGraphNodeLabel(labelSources, node.labelKey);
    if (label === node.labelKey) {
      issues.push(`missing message for node label "${node.labelKey}"`);
    }
    for (const childId of node.childNodeIds) {
      if (!nodeIds.has(childId)) {
        issues.push(`node "${node.id}" references missing child "${childId}"`);
      }
    }
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push(
        `edge "${edge.id}" references missing source "${edge.source}"`,
      );
    }
    if (!nodeIds.has(edge.target)) {
      issues.push(
        `edge "${edge.id}" references missing target "${edge.target}"`,
      );
    }
  }

  if (issues.length > 0) {
    throw new GraphRenderIssueError(graph.id, issues);
  }
}

export function buildRegistryFlowGraph(
  graph: GraphRecord,
  messages: PageMessages,
  fallbackMessages?: PageMessages,
): { nodes: Node<RegistryFlowNodeData>[]; edges: Edge[] } {
  const ordered = orderGraphNodes(graph);
  const labelSources = fallbackMessages
    ? [fallbackMessages, messages]
    : [messages];
  validateRegistryFlowGraph(graph, labelSources);
  const nodes: Node<RegistryFlowNodeData>[] = ordered.map((node, index) => {
    const basePosition = node.position ?? { x: NODE_X, y: index * NODE_Y_GAP };
    const position =
      node.visualRole === "row-label"
        ? { ...basePosition, x: basePosition.x + ROW_LABEL_X_OFFSET }
        : basePosition;
    const label = resolveGraphNodeLabel(labelSources, node.labelKey);
    const resolvedSize = estimateRegistryFlowNodeBoxSize({
      label,
      visualRole: node.visualRole,
      requestedSize: node.size,
    });

    return {
      id: node.id,
      position,
      type: "attentionHead",
      ...(resolvedSize
        ? { style: { width: resolvedSize.width, height: resolvedSize.height } }
        : {}),
      ...(node.zIndex !== undefined ? { zIndex: node.zIndex } : {}),
      data: {
        label,
        moduleKind: node.moduleKind,
        ...(resolvedSize ? { size: resolvedSize } : {}),
        ...(node.headCountRole ? { headCountRole: node.headCountRole } : {}),
        ...(node.visualRole ? { visualRole: node.visualRole } : {}),
      },
    };
  });

  return {
    nodes,
    edges: buildRegistryFlowEdges(graph),
  };
}
