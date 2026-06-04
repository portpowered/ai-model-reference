import { RelatedDocList } from "@/features/docs/components/RelatedDocList";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

export function RelatedDocs({ registryId }: { registryId: string }) {
  const source = getRegistryRecordById(registryId);
  if (!source) {
    return null;
  }

  const items = deriveCuratedRelatedItems(
    source,
    listRelatedRegistryRecords(),
    getPublishedDocsRegistryIds(),
  );
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="my-4" data-testid="curated-related-docs">
      <RelatedDocList items={items} testId="curated-related-docs" />
    </div>
  );
}
