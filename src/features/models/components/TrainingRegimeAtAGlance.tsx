import { LocalizedMonthYear } from "@/features/docs/components/LocalizedMonthYear";
import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import {
  AtAGlanceCard,
  AtAGlanceListSection,
} from "@/features/models/components/AtAGlanceCard";
import { deriveOntologyMetadataLabels } from "@/lib/content/metadata-labels";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { getTrainingRegimeById } from "@/lib/content/registry-runtime";

export function TrainingRegimeAtAGlance({
  registryId,
}: {
  registryId: string;
}) {
  const record = getTrainingRegimeById(registryId);
  if (!record) {
    return null;
  }

  const releaseMetadata = buildPageReleaseMetadata(record);
  const metadataLabels = deriveOntologyMetadataLabels(record);

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
        {metadataLabels.primaryLabel ? (
          <AtAGlanceListSection title="Regime type">
            <p className="text-sm text-foreground">
              {metadataLabels.primaryLabel}
            </p>
          </AtAGlanceListSection>
        ) : null}
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
