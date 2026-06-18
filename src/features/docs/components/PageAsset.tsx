"use client";

import { MissingAssetId } from "@/features/docs/components/MissingAssetId";
import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { usePageAssets } from "@/features/docs/components/page-assets-context";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import {
  ActivationFunctionChart,
  isActivationChartId,
} from "@/features/models/components/ActivationFunctionChart";
import { AttentionVariantComparisonGraph } from "@/features/models/components/AttentionVariantComparisonGraph";
import { RegistryComparisonTable } from "@/features/models/components/RegistryComparisonTable";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import { lookupAsset, resolveAssetText } from "@/lib/content/assets";
import { lookupMessage } from "@/lib/content/messages";
import type { PageAsset as PageAssetRecord } from "@/lib/content/schemas";

function AssetCaption({ caption }: { caption: string }) {
  return <figcaption>{caption}</figcaption>;
}

function ImageAssetSlot({
  assetId,
  asset,
  alt,
  caption,
}: {
  assetId: string;
  asset: Extract<PageAssetRecord, { type: "image" }>;
  alt: string;
  caption?: string;
}) {
  return (
    <figure data-page-asset={assetId} data-asset-type="image">
      <img
        src={asset.src}
        alt={alt}
        width={asset.width}
        height={asset.height}
      />
      {caption ? <AssetCaption caption={caption} /> : null}
    </figure>
  );
}

function GraphAssetSlot({
  assetId,
  asset,
  alt,
  caption,
}: {
  assetId: string;
  asset: Extract<PageAssetRecord, { type: "graph" }>;
  alt?: string;
  caption?: string;
}) {
  if (asset.webRenderer === "react-flow") {
    return (
      <RegistryGraphFlow
        assetId={assetId}
        graphId={asset.graphId}
        alt={alt}
        caption={caption}
      />
    );
  }

  return (
    <figure data-page-asset={assetId} data-asset-type="graph">
      <div
        data-graph-id={asset.graphId}
        data-web-renderer={asset.webRenderer}
        role="img"
        aria-label={alt ?? `Graph ${asset.graphId}`}
      >
        {alt ?? asset.graphId}
      </div>
      {caption ? <AssetCaption caption={caption} /> : null}
    </figure>
  );
}

function TableAssetSlot({
  assetId,
  asset,
  caption,
  isDev,
}: {
  assetId: string;
  asset: Extract<PageAssetRecord, { type: "table" }>;
  caption?: string;
  isDev: boolean;
}) {
  return (
    <RegistryComparisonTable
      assetId={assetId}
      tableId={asset.tableId}
      caption={caption}
      isDev={isDev}
    />
  );
}

function StructuredAssetSlot({
  assetId,
  asset,
  caption,
}: {
  assetId: string;
  asset: Extract<PageAssetRecord, { type: "chart" | "code-schema" }>;
  caption?: string;
}) {
  const referenceId = asset.type === "chart" ? asset.chartId : asset.schemaId;

  return (
    <figure data-page-asset={assetId} data-asset-type={asset.type}>
      <div data-asset-reference-id={referenceId}>{referenceId}</div>
      {caption ? <AssetCaption caption={caption} /> : null}
    </figure>
  );
}

function ChartAssetSlot({
  assetId,
  asset,
  alt,
  caption,
}: {
  assetId: string;
  asset: Extract<PageAssetRecord, { type: "chart" }>;
  alt?: string;
  caption?: string;
}) {
  return (
    <ActivationFunctionChart
      assetId={assetId}
      chartId={asset.chartId}
      alt={alt}
      caption={caption}
    />
  );
}

export function PageAsset({ assetId }: { assetId: string }) {
  const { assets, isDev } = usePageAssets();
  const { messages } = usePageMessages();
  const lookup = lookupAsset(assets, assetId);

  if (!lookup.ok) {
    if (isDev) {
      return <MissingAssetId assetId={assetId} reason={lookup.reason} />;
    }
    return null;
  }

  const { asset } = lookup;
  const text = resolveAssetText(messages, asset);

  if (asset.type === "image") {
    const altResult = lookupMessage(messages, asset.altKey);
    if (!altResult.ok) {
      if (isDev) {
        return (
          <MissingMessageKey
            messageKey={asset.altKey}
            reason={altResult.reason}
          />
        );
      }
      return null;
    }

    return (
      <ImageAssetSlot
        assetId={assetId}
        asset={asset}
        alt={altResult.value}
        caption={text.caption}
      />
    );
  }

  if (asset.type === "graph") {
    return (
      <GraphAssetSlot
        assetId={assetId}
        asset={asset}
        alt={text.alt}
        caption={text.caption}
      />
    );
  }

  if (asset.type === "attention-variant-graph") {
    return (
      <AttentionVariantComparisonGraph
        assetId={assetId}
        variants={asset.variants}
        defaultVariantId={asset.defaultVariantId}
        alt={text.alt}
        caption={text.caption}
        isDev={isDev}
      />
    );
  }

  if (asset.type === "table") {
    return (
      <TableAssetSlot
        assetId={assetId}
        asset={asset}
        caption={text.caption}
        isDev={isDev}
      />
    );
  }

  if (asset.type === "chart") {
    if (!isActivationChartId(asset.chartId)) {
      return (
        <StructuredAssetSlot
          assetId={assetId}
          asset={asset}
          caption={text.caption}
        />
      );
    }

    return (
      <ChartAssetSlot
        assetId={assetId}
        asset={asset}
        alt={text.alt}
        caption={text.caption}
      />
    );
  }

  return (
    <StructuredAssetSlot
      assetId={assetId}
      asset={asset}
      caption={text.caption}
    />
  );
}
