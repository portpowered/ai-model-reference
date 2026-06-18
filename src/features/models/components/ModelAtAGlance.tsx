import { LocalizedMonthYear } from "@/features/docs/components/LocalizedMonthYear";
import {
  AtAGlanceCard,
  AtAGlanceDefinitionRow,
} from "@/features/models/components/AtAGlanceCard";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { getModelById } from "@/lib/content/registry-runtime";

function formatToken(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSourceType(value: string): string {
  if (value === "open-weights") {
    return "Open weights";
  }
  return formatToken(value);
}

const DefinitionRow = AtAGlanceDefinitionRow;

export function ModelAtAGlance({ registryId }: { registryId: string }) {
  const record = getModelById(registryId);
  if (!record) {
    return null;
  }
  const releaseMetadata = buildPageReleaseMetadata(record);

  const modalities = record.modalities.map(formatToken).join(", ");
  const precision =
    record.precision && record.precision.length > 0
      ? record.precision.join(", ")
      : undefined;
  const contextLength = record.contextLength
    ? `${record.contextLength.toLocaleString()} tokens`
    : undefined;

  return (
    <AtAGlanceCard registryId={registryId}>
      <dl className="space-y-3">
        <DefinitionRow label="Family" value={record.family} />
        <DefinitionRow
          label="Source type"
          value={formatSourceType(record.sourceType)}
        />
        {releaseMetadata?.releaseDate ? (
          <DefinitionRow
            label={releaseMetadata.dateLabel}
            value={<LocalizedMonthYear value={releaseMetadata.releaseDate} />}
          />
        ) : null}
        <DefinitionRow
          label="Authors"
          value={
            releaseMetadata?.authors.length
              ? releaseMetadata.authors.length <= 3
                ? releaseMetadata.authors.join(", ")
                : `${releaseMetadata.authors.slice(0, 3).join(", ")}, et al.`
              : undefined
          }
        />
        <DefinitionRow
          label="Source"
          value={
            releaseMetadata?.source ? (
              <a
                className="underline decoration-border underline-offset-4 transition-colors hover:text-primary"
                href={releaseMetadata.source.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {releaseMetadata.source.title}
              </a>
            ) : undefined
          }
        />
        <DefinitionRow label="Modalities" value={modalities} />
        <DefinitionRow label="Parameter count" value={record.parameterCount} />
        <DefinitionRow label="Context length" value={contextLength} />
        <DefinitionRow label="Precision" value={precision} />
      </dl>
    </AtAGlanceCard>
  );
}
