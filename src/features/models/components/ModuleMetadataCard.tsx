import { getModuleById } from "@/lib/content/registry-runtime";
import type { ModuleRecord } from "@/lib/content/schemas";

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function buildRows(record: ModuleRecord) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Module type", value: formatLabel(record.moduleType) },
    { label: "Status", value: formatLabel(record.status) },
    { label: "Math level", value: formatLabel(record.mathLevel) },
  ];

  if (record.moduleFamily) {
    rows.push({
      label: "Module family",
      value: formatLabel(record.moduleFamily),
    });
  }
  if (record.conceptType) {
    rows.push({
      label: "Concept type",
      value: formatLabel(record.conceptType),
    });
  }
  if (record.variantGroup) {
    rows.push({
      label: "Variant group",
      value: formatLabel(record.variantGroup),
    });
  }

  return rows;
}

export function ModuleMetadataCard({ registryId }: { registryId: string }) {
  const record = getModuleById(registryId);
  if (!record) {
    return null;
  }

  const rows = buildRows(record);

  return (
    <aside
      className="my-6 rounded-lg border border-border bg-card p-4"
      data-registry-id={registryId}
      aria-label="Module metadata"
    >
      <dl className="space-y-3">
        {rows.map((row) => (
          <MetadataRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </aside>
  );
}
