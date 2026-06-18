import { LocalizedMonthYear } from "@/features/docs/components/LocalizedMonthYear";
import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import {
  AtAGlanceCard,
  AtAGlanceListSection,
} from "@/features/models/components/AtAGlanceCard";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { loadRegistry } from "@/lib/content/registry";

function formatToken(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function TrainingRegimeAtAGlance({
  registryId,
}: {
  registryId: string;
}) {
  const registry = await loadRegistry();
  const record = registry.byId.get(registryId);
  if (record?.kind !== "training-regime") {
    return null;
  }

  const releaseMetadata = buildPageReleaseMetadata(record);

  return (
    <AtAGlanceCard registryId={registryId}>
      <div className="space-y-4">
        {releaseMetadata?.releaseDate ? (
          <div>
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              {releaseMetadata.dateLabel}
            </h3>
            <p className="text-sm text-foreground">
              <LocalizedMonthYear value={releaseMetadata.releaseDate} />
            </p>
          </div>
        ) : null}
        {releaseMetadata?.authors.length ? (
          <div>
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              Authors
            </h3>
            <p className="text-sm text-foreground">
              {releaseMetadata.authors.length <= 3
                ? releaseMetadata.authors.join(", ")
                : `${releaseMetadata.authors.slice(0, 3).join(", ")}, et al.`}
            </p>
          </div>
        ) : null}
        <AtAGlanceListSection title="Regime type">
          <p className="text-sm text-foreground">
            {formatToken(record.regimeType)}
          </p>
        </AtAGlanceListSection>
        <AtAGlanceListSection title="Related modules">
          <RegistryLinkList
            registryIds={record.relatedModuleIds}
            emptyLabel="No related modules listed yet."
          />
        </AtAGlanceListSection>
      </div>
    </AtAGlanceCard>
  );
}
