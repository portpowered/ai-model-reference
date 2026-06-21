"use client";

import { useOptionalPageMessages } from "@/features/docs/components/page-messages-context";
import { RelatedDocList } from "@/features/docs/components/RelatedDocList";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  CLASSIFICATION_SIBLINGS,
  CURATED_RELATED,
  DIRECT_RELATIONSHIPS,
  deriveRelatedDocGroups,
  SHARED_PARENT_CLASSIFICATION,
} from "@/lib/content/related-docs";

export function RelatedDocs({ registryId }: { registryId: string }) {
  const messages = useOptionalPageMessages();
  const source = getRegistryRecordById(registryId);
  if (!source) {
    return null;
  }

  const candidates = listRelatedRegistryRecords();
  const publishedRegistryIds = getPublishedDocsRegistryIds();
  const groups = deriveRelatedDocGroups(
    source,
    candidates,
    [
      CURATED_RELATED,
      DIRECT_RELATIONSHIPS,
      CLASSIFICATION_SIBLINGS,
      SHARED_PARENT_CLASSIFICATION,
    ],
    publishedRegistryIds,
  )
    .map((group) => ({
      ...group,
      items:
        group.id === CURATED_RELATED
          ? applyRelatedDocMessageOverrides(group.items, messages)
          : group.items,
    }))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href),
    }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <>
      {groups.map((group) => {
        const testId =
          group.id === CURATED_RELATED
            ? "curated-related-docs"
            : `${group.id}-related-docs`;

        return (
          <div key={group.id} className="my-4" data-testid={testId}>
            <RelatedDocList
              items={group.items}
              groupId={group.id}
              testId={testId}
            />
          </div>
        );
      })}
    </>
  );
}
