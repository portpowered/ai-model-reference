"use client";

import { PageAsset } from "@/features/docs/components/PageAsset";

export function TrainingRegimeFlow({
  registryId: _registryId,
  assetId,
  legendItems,
  legendTitle,
  title,
}: {
  registryId: string;
  assetId: string;
  title?: string;
  legendTitle?: string;
  legendItems?: readonly string[];
}) {
  return (
    <div className="space-y-4">
      {title ? (
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      ) : null}
      <PageAsset assetId={assetId} />
      {legendTitle && legendItems && legendItems.length > 0 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{legendTitle}</p>
          <ul className="mt-3 space-y-2 pl-5 text-sm text-muted-foreground">
            {legendItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
