import {
  deriveOntologyMetadataLabels,
  formatMetadataToken,
} from "@/lib/content/metadata-labels";
import { getModuleById } from "@/lib/content/registry-runtime";
import type { ModuleRecord } from "@/lib/content/schemas";

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function buildRows(record: ModuleRecord) {
  const metadataLabels = deriveOntologyMetadataLabels(record);
  const rows: Array<{ label: string; value: string }> = [
    { label: "Status", value: formatMetadataToken(record.status) },
    { label: "Math level", value: formatMetadataToken(record.mathLevel) },
  ];

  if (metadataLabels.primaryLabel) {
    rows.unshift({
      label: "Classification",
      value: metadataLabels.primaryLabel,
    });
  }

  if (metadataLabels.secondaryLabels.length > 0) {
    rows.push({
      label: "Also classified as",
      value: metadataLabels.secondaryLabels.join(", "),
    });
  }

  return rows;
}

export function ModuleMetadataCard({ registryId }: { registryId: string }) {
  const record = getModuleById(registryId);
  if (!record) {
    return (
      <aside
        className="my-6 rounded-lg border border-border bg-card p-4"
        data-registry-id={registryId}
        aria-label="Module metadata"
      >
        <p className="text-sm text-muted-foreground">
          Module metadata is unavailable for this record.
        </p>
      </aside>
    );
  }

  const rows = buildRows(record);

  return (
    <aside
      className="my-6 rounded-lg border border-border bg-card p-4"
      data-registry-id={registryId}
      aria-label="Module metadata"
    >
      <dl className="space-y-2">
        {rows.map((row) => (
          <MetadataRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </aside>
  );
}
