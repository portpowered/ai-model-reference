import { LocalizedMonthYear } from "@/features/docs/components/LocalizedMonthYear";
import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import {
  AtAGlanceCard,
  AtAGlanceListSection,
} from "@/features/models/components/AtAGlanceCard";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { getModuleById } from "@/lib/content/registry-runtime";

function formatToken(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function BulletList({
  items,
  formatItem = (item) => item,
}: {
  items: string[];
  formatItem?: (item: string) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None listed yet.</p>;
  }

  return (
    <ul className="flex list-none flex-col gap-1 text-sm text-foreground">
      {items.map((item) => (
        <li key={item}>{formatItem(item)}</li>
      ))}
    </ul>
  );
}

export function ModuleAtAGlance({ registryId }: { registryId: string }) {
  const record = getModuleById(registryId);
  if (!record) {
    return null;
  }
  const releaseMetadata = buildPageReleaseMetadata(record);

  return (
    <AtAGlanceCard registryId={registryId}>
      <div className="space-y-4">
        {releaseMetadata ? (
          <div className="space-y-2">
            {releaseMetadata.releaseDate ? (
              <div>
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                  {releaseMetadata.dateLabel}
                </h3>
                <p className="text-sm text-foreground">
                  <LocalizedMonthYear value={releaseMetadata.releaseDate} />
                </p>
              </div>
            ) : null}
            {releaseMetadata.authors.length > 0 ? (
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
            {releaseMetadata.source ? (
              <div>
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                  Source
                </h3>
                <a
                  className="text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
                  href={releaseMetadata.source.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {releaseMetadata.source.title}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
        <AtAGlanceListSection title="Optimizes">
          <BulletList items={record.optimizes} formatItem={formatToken} />
        </AtAGlanceListSection>
        {record.exampleModelIds.length > 0 ? (
          <AtAGlanceListSection title="Example models">
            <RegistryLinkList
              registryIds={record.exampleModelIds}
              emptyLabel="No example models listed yet."
            />
          </AtAGlanceListSection>
        ) : null}
      </div>
    </AtAGlanceCard>
  );
}
