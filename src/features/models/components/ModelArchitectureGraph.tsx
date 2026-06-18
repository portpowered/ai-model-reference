"use client";

import { PageAsset } from "@/features/docs/components/PageAsset";

export function ModelArchitectureGraph({
  registryId: _registryId,
  assetId,
}: {
  registryId: string;
  assetId: string;
}) {
  return <PageAsset assetId={assetId} />;
}
