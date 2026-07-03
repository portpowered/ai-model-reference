"use client";

import { PageAsset } from "@/features/docs/components/PageAsset";
import { usePageAssets } from "@/features/docs/components/page-assets-context";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import { buildRegistryGraphLegend } from "@/features/models/components/registry-graph-legend";
import { lookupAsset, resolveAssetText } from "@/lib/content/assets";

export function ConceptMap({
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
  const assetMessages = messages.assets?.[assetId];

  return (
    <RegistryGraphFlow
      assetId={assetId}
      graphId={asset.graphId}
      alt={text.alt}
      caption={text.caption}
      title={assetMessages?.title}
      legend={buildRegistryGraphLegend(asset.graphId, assetMessages?.legend)}
    />
  );
}
