"use client";

import { PageAsset } from "@/features/docs/components/PageAsset";

export function SystemFlowGraph({
  registryId: _registryId,
  assetId,
}: {
  registryId: string;
  assetId: string;
}) {
  return <PageAsset assetId={assetId} />;
}
