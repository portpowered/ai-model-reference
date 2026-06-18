import { LocalizedMonthYear } from "@/features/docs/components/LocalizedMonthYear";
import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import {
  AtAGlanceCard,
  AtAGlanceListSection,
} from "@/features/models/components/AtAGlanceCard";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { loadRegistry } from "@/lib/content/registry";

export async function PaperAtAGlance({ registryId }: { registryId: string }) {
  const registry = await loadRegistry();
  const record = registry.byId.get(registryId);
  if (record?.kind !== "paper") {
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
        <AtAGlanceListSection title="Introduces">
          <RegistryLinkList
            registryIds={record.introducesIds}
            emptyLabel="No introduced records listed yet."
          />
        </AtAGlanceListSection>
        <AtAGlanceListSection title="Supports">
          <RegistryLinkList
            registryIds={record.supportsIds}
            emptyLabel="No supported records listed yet."
          />
        </AtAGlanceListSection>
      </div>
    </AtAGlanceCard>
  );
}
