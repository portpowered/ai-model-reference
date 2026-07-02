"use client";

import { PageAsset } from "@/features/docs/components/PageAsset";
import { usePageAssets } from "@/features/docs/components/page-assets-context";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { AttentionVariantComparisonGraph } from "@/features/models/components/AttentionVariantComparisonGraph";
import { buildModuleComputeFlowLegend } from "@/features/models/components/module-compute-flow-legend";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import { lookupAsset, resolveAssetText } from "@/lib/content/assets";

export function ModuleGraph({
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
  const text = resolveAssetText(messages, asset);
  const assetMessages = messages.assets?.[assetId];

  if (asset.type === "attention-variant-graph") {
    return (
      <AttentionVariantComparisonGraph
        assetId={assetId}
        variants={asset.variants}
        defaultVariantId={asset.defaultVariantId}
        alt={text.alt}
        caption={text.caption}
        title={assetMessages?.title}
        legendMessages={assetMessages?.legend}
      />
    );
  }

  if (asset.type !== "graph" || asset.webRenderer !== "react-flow") {
    return <PageAsset assetId={assetId} />;
  }

  return (
    <RegistryGraphFlow
      assetId={assetId}
      graphId={asset.graphId}
      alt={text.alt}
      caption={text.caption}
      title={assetMessages?.title}
      legend={buildModuleComputeFlowLegend(
        asset.graphId,
        assetMessages?.legend,
      )}
    />
  );
}
