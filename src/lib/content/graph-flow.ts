import type { Edge, Node } from "@xyflow/react";
import { lookupMessage } from "@/lib/content/messages";
import type {
  GraphRecord,
  ModuleGraphNode,
  PageMessages,
} from "@/lib/content/schemas";

const NODE_X = 0;
const NODE_Y_GAP = 80;

export type RegistryFlowNodeData = {
  label: string;
  moduleKind: string;
};

export function resolveGraphNodeLabel(
  messages: PageMessages,
  labelKey: string,
): string {
  const result = lookupMessage(messages, labelKey);
  return result.ok ? result.value : labelKey;
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
      type: "smoothstep",
    }));
  }

  const edges: Edge[] = [];
  for (const node of graph.nodes) {
    for (const childId of node.childNodeIds) {
      edges.push({
        id: `${node.id}->${childId}`,
        source: node.id,
        target: childId,
        type: "smoothstep",
      });
    }
  }
  return edges;
}

export function buildRegistryFlowGraph(
  graph: GraphRecord,
  messages: PageMessages,
): { nodes: Node<RegistryFlowNodeData>[]; edges: Edge[] } {
  const ordered = orderGraphNodes(graph);
  const nodes: Node<RegistryFlowNodeData>[] = ordered.map((node, index) => ({
    id: node.id,
    position: { x: NODE_X, y: index * NODE_Y_GAP },
    data: {
      label: resolveGraphNodeLabel(messages, node.labelKey),
      moduleKind: node.moduleKind,
    },
  }));

  return {
    nodes,
    edges: buildRegistryFlowEdges(graph),
  };
}
