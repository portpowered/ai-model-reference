import { RelatedDocList } from "@/features/docs/components/RelatedDocList";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveRelatedDocGroups } from "@/lib/content/related-docs";

type DerivedRelatedDocsProps = {
  registryId: string;
  groups: string[];
};

export function DerivedRelatedDocs({
  registryId,
  groups,
}: DerivedRelatedDocsProps) {
  const source = getRegistryRecordById(registryId);
  if (!source) {
    return null;
  }

  const publishedRegistryIds = getPublishedDocsRegistryIds();
  const derivedGroups = deriveRelatedDocGroups(
    source,
    listRelatedRegistryRecords(),
    groups,
    publishedRegistryIds,
  )
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href),
    }))
    .filter((group) => group.items.length > 0);
  if (derivedGroups.length === 0) {
    return null;
  }

  return (
    <div className="my-4 space-y-6" data-testid="derived-related-docs">
      {derivedGroups.map((group) => (
        <section key={group.id} aria-label={group.reasonLabel}>
          <RelatedDocList items={group.items} groupId={group.id} />
        </section>
      ))}
    </div>
  );
}
