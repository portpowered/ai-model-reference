import type { GraphLegendItem } from "@/features/graphs/components/GraphFrame";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import type { ModuleGraphEdge } from "@/lib/content/schemas";

const EDGE_KIND_COLORS: Partial<Record<ModuleGraphEdge["edgeKind"], string>> = {
  "cache-read": "#2563eb",
  "cache-write": "#2563eb",
  contains: "#334155",
  "control-flow": "#111111",
  "data-flow": "#111111",
  "parameter-sharing": "#0f172a",
  residual: "#7c3aed",
} as const;

const VISUAL_ROLE_COLORS = {
  "summary-node": "#0369a1",
  "process-node": "#7c2d12",
  annotation: "#64748b",
} as const;

export function buildModuleComputeFlowLegend(
  graphId: string,
  legendMessages: Record<string, { label: string }> | undefined,
): GraphLegendItem[] {
  const graph = getGraphById(graphId);
  if (!graph || !legendMessages) {
    return [];
  }

  const legend = new Map<string, GraphLegendItem>();

  for (const edge of graph.edges) {
    const color = EDGE_KIND_COLORS[edge.edgeKind];
    const label = legendMessages[edge.edgeKind]?.label;
    if (!color || !label || legend.has(label)) {
      continue;
    }

    legend.set(label, { color, label });
  }

  for (const node of graph.nodes) {
    const visualRole = node.visualRole;
    if (!visualRole || !(visualRole in VISUAL_ROLE_COLORS)) {
      continue;
    }

    const label = legendMessages[visualRole]?.label;
    const color =
      VISUAL_ROLE_COLORS[visualRole as keyof typeof VISUAL_ROLE_COLORS];
    if (!label || legend.has(label)) {
      continue;
    }

    legend.set(label, { color, label });
  }

  return [...legend.values()];
}
