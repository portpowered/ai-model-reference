export function ModuleComparisonTable({
  registryId: _registryId,
  assetId,
}: {
  registryId: string;
  assetId: string;
}) {
  return (
    <div
      className="my-4 rounded-md border border-border p-4 text-sm text-muted-foreground"
      data-comparison-table-asset={assetId}
    >
      Comparison table placeholder
    </div>
  );
}
