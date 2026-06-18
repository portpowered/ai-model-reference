"use client";

import { useOptionalPageMessagesContext } from "@/features/docs/components/page-messages-context";
import { RelatedDocList } from "@/features/docs/components/RelatedDocList";
import { isLocalizedDocsHrefVisible } from "@/lib/content/localized-docs-href";
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
  const pageContext = useOptionalPageMessagesContext();
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
  );
  const visibleGroups = pageContext
    ? derivedGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              !item.href ||
              isLocalizedDocsHrefVisible(item.href, pageContext.locale),
          ),
        }))
        .filter((group) => group.items.length > 0)
    : derivedGroups;
  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <div className="my-4 space-y-6" data-testid="derived-related-docs">
      {visibleGroups.map((group) => (
        <section key={group.id} aria-label={group.reasonLabel}>
          <RelatedDocList items={group.items} groupId={group.id} />
        </section>
      ))}
    </div>
  );
}
