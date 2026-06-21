import { LocalizedMonthYear } from "@/features/docs/components/LocalizedMonthYear";
import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import {
  AtAGlanceCard,
  AtAGlanceListSection,
} from "@/features/models/components/AtAGlanceCard";
import { deriveOntologyMetadataLabels } from "@/lib/content/metadata-labels";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { getSystemById } from "@/lib/content/registry-runtime";

export function SystemAtAGlance({ registryId }: { registryId: string }) {
  const record = getSystemById(registryId);
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
        {metadataLabels.primaryLabel ? (
          <AtAGlanceListSection title="System type">
            <p className="text-sm text-foreground">
              {metadataLabels.primaryLabel}
            </p>
          </AtAGlanceListSection>
        ) : null}
        <AtAGlanceListSection title="Related models">
          <RegistryLinkList
            registryIds={record.relatedModelIds}
            emptyLabel="No related models listed yet."
          />
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
