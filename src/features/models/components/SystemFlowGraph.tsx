"use client";

import { PageAsset } from "@/features/docs/components/PageAsset";
import { usePageAssets } from "@/features/docs/components/page-assets-context";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import type { GraphLegendItem } from "@/features/graphs/components/GraphFrame";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import { lookupAsset, resolveAssetText } from "@/lib/content/assets";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import type { ModuleGraphEdge } from "@/lib/content/schemas";

const EDGE_KIND_LEGEND: Partial<
  Record<ModuleGraphEdge["edgeKind"], GraphLegendItem>
> = {
  "cache-read": { color: "#2563eb", label: "Cache reuse and reads" },
  "cache-write": { color: "#2563eb", label: "Cache writes and reuse" },
  contains: { color: "#334155", label: "Contained subflow" },
  "control-flow": { color: "#111111", label: "Control flow" },
  "data-flow": { color: "#111111", label: "Request and weight flow" },
  "parameter-sharing": { color: "#0f172a", label: "Shared parameters" },
  residual: { color: "#7c3aed", label: "Residual connection" },
} as const;

function humanizeAssetId(assetId: string): string {
  return assetId
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSystemFlowTitle(
  pageTitle: string | undefined,
  assetId: string,
): string {
  const assetTitle = humanizeAssetId(assetId);
  return pageTitle ? `${pageTitle} ${assetTitle}` : assetTitle;
}

function buildSystemFlowLegend(graphId: string): GraphLegendItem[] {
  const graph = getGraphById(graphId);
  if (!graph) {
    return [];
  }

  const legend = new Map<string, GraphLegendItem>();
  for (const edge of graph.edges) {
    const entry = EDGE_KIND_LEGEND[edge.edgeKind];
    if (!entry) {
      continue;
    }
    if (!legend.has(entry.label)) {
      legend.set(entry.label, entry);
    }
  }
  return [...legend.values()];
}

export function SystemFlowGraph({
  registryId: _registryId,
  assetId,
}: {
  registryId: string;
  assetId: string;
}) {
  const { assets } = usePageAssets();
  const { messages } = usePageMessages();
  const lookup = lookupAsset(assets, assetId);

  if (!lookup.ok) {
    return <PageAsset assetId={assetId} />;
  }

  const { asset } = lookup;
  if (asset.type !== "graph" || asset.webRenderer !== "react-flow") {
    return <PageAsset assetId={assetId} />;
  }

  const text = resolveAssetText(messages, asset);

  return (
    <RegistryGraphFlow
      assetId={assetId}
      graphId={asset.graphId}
      alt={text.alt}
      caption={text.caption}
      title={buildSystemFlowTitle(messages.title, assetId)}
      legend={buildSystemFlowLegend(asset.graphId)}
    />
  );
}
