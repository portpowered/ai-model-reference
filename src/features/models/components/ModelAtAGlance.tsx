import Link from "next/link";
import type { ReactNode } from "react";
import { modelPageHref } from "@/lib/content/content-hrefs";
import { getModelById, listModelRecords } from "@/lib/content/registry-runtime";

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatModalities(modalities: string[]): string {
  return modalities.map(formatLabel).join(", ");
}

function formatContextLength(value?: number): string {
  if (!value) {
    return "Not listed";
  }
  return `${value.toLocaleString("en-US")} tokens`;
}

function findFamilyHub(registryId: string, family: string) {
  return listModelRecords().find(
    (candidate) =>
      candidate.id !== registryId &&
      candidate.family === family &&
      candidate.tags.includes("model-family"),
  );
}

function MetadataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function ModelAtAGlance({ registryId }: { registryId: string }) {
  const record = getModelById(registryId);
  if (!record) {
    return null;
  }

  const familyHub = findFamilyHub(record.id, record.family);

  return (
    <section
      className="my-6 rounded-lg border border-border bg-card p-4"
      data-registry-id={registryId}
      data-testid="model-at-a-glance"
      aria-label="At a glance"
    >
      <h2 className="mb-4 text-base font-semibold text-foreground">
        At a glance
      </h2>
      <dl className="space-y-3">
        <MetadataRow
          label="Family"
          value={
            familyHub ? (
              <Link
                href={modelPageHref(familyHub.slug)}
                className="underline-offset-4 hover:underline"
              >
                {familyHub.aliases[0] ?? formatLabel(familyHub.slug)}
              </Link>
            ) : (
              formatLabel(record.family)
            )
          }
        />
        <MetadataRow
          label="Source type"
          value={formatLabel(record.sourceType)}
        />
        <MetadataRow
          label="Modalities"
          value={formatModalities(record.modalities)}
        />
        <MetadataRow
          label="Release date"
          value={record.releaseDate ?? "Not listed"}
        />
        <MetadataRow
          label="Parameter count"
          value={record.parameterCount ?? "Not listed"}
        />
        <MetadataRow
          label="Context length"
          value={formatContextLength(record.contextLength)}
        />
      </dl>
    </section>
  );
}
