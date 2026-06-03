import {
  formatMissingAssetId,
  type MissingAssetReason,
} from "@/lib/content/assets";

export function MissingAssetId({
  assetId,
  reason = "missing",
}: {
  assetId: string;
  reason?: MissingAssetReason;
}) {
  return (
    <span
      data-missing-asset-id={assetId}
      role="alert"
      style={{
        display: "inline-block",
        padding: "0.125rem 0.375rem",
        border: "1px solid var(--destructive, #c53030)",
        borderRadius: "0.25rem",
        color: "var(--destructive-foreground, #fff)",
        background: "var(--destructive, #c53030)",
        fontFamily: "monospace",
        fontSize: "0.875rem",
      }}
    >
      {formatMissingAssetId(assetId, reason)}
    </span>
  );
}
