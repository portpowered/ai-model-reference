import type { Edge, Node } from "@xyflow/react";
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

export type RegistryFlowNodeData = {
  label: string;
  moduleKind: string;
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
    | "latent-node"
    | "annotation"
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
      type: "straight",
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
        type: "straight",
        style: buildRegistryFlowEdgeStyle({ edgeKind: "data-flow" }),
      });
    }
  }
  return edges;
}

function buildRegistryFlowEdgeStyle(
  edge: Pick<ModuleGraphEdge, "edgeKind">,
): CSSProperties {
  switch (edge.edgeKind) {
    case "parameter-sharing":
      return {
        strokeWidth: 3,
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
    default:
      return {
        strokeWidth: 3,
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

    return {
      id: node.id,
      position,
      type: "attentionHead",
      data: {
        label: resolveGraphNodeLabel(labelSources, node.labelKey),
        moduleKind: node.moduleKind,
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
