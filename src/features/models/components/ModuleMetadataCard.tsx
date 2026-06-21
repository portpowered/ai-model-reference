import {
  getModuleById,
  getPrimaryClassificationForRecord,
  listSecondaryClassificationsForRecord,
} from "@/lib/content/registry-runtime";
import type { ModuleRecord } from "@/lib/content/schemas";

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatClassificationLabel(classificationId: string): string {
  const slug = classificationId.split(".").at(-1) ?? classificationId;
  return formatLabel(slug);
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function buildRows(record: ModuleRecord) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Status", value: formatLabel(record.status) },
    { label: "Math level", value: formatLabel(record.mathLevel) },
  ];

  const primaryClassification = getPrimaryClassificationForRecord(record.id);
  if (primaryClassification) {
    rows.unshift({
      label: "Classification",
      value: formatClassificationLabel(primaryClassification.slug),
    });
  }

  const secondaryClassifications = listSecondaryClassificationsForRecord(
    record.id,
  );
  if (secondaryClassifications.length > 0) {
    rows.push({
      label: "Also classified as",
      value: secondaryClassifications
        .map((classification) => formatClassificationLabel(classification.slug))
        .join(", "),
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
