import { RelatedDocList } from "@/features/docs/components/RelatedDocList";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
  deriveSameVariantGroupPeers,
  SAME_VARIANT_GROUP,
} from "@/lib/content/related-docs";
import type { ModuleRecord } from "@/lib/content/schemas";

export function RelatedDocs({ registryId }: { registryId: string }) {
  const source = getRegistryRecordById(registryId);
  if (!source) {
    return null;
  }

  const candidates = listRelatedRegistryRecords();
  const publishedRegistryIds = getPublishedDocsRegistryIds();
  const curatedItems = deriveCuratedRelatedItems(
    source,
    candidates,
    publishedRegistryIds,
  );
  const variantGroupItems =
    source.kind === "module"
      ? deriveSameVariantGroupPeers(
          source,
          candidates.filter(
            (candidate): candidate is ModuleRecord =>
              candidate.kind === "module",
          ),
          publishedRegistryIds,
        )
      : [];

  if (variantGroupItems.length === 0 && curatedItems.length === 0) {
    return null;
  }

  return (
    <>
      {variantGroupItems.length > 0 ? (
        <div className="my-4" data-testid="variant-group-related-docs">
          <RelatedDocList
            items={variantGroupItems}
            groupId={SAME_VARIANT_GROUP}
          />
        </div>
      ) : null}
      {curatedItems.length > 0 ? (
        <div className="my-4" data-testid="curated-related-docs">
          <RelatedDocList items={curatedItems} testId="curated-related-docs" />
        </div>
      ) : null}
    </>
  );
}
