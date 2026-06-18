"use client";

import {
  useOptionalPageMessages,
  useOptionalPageMessagesContext,
} from "@/features/docs/components/page-messages-context";
import { RelatedDocList } from "@/features/docs/components/RelatedDocList";
import { isLocalizedDocsHrefVisible } from "@/lib/content/localized-docs-href";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  deriveCuratedRelatedItems,
  deriveSameVariantGroupPeers,
  SAME_VARIANT_GROUP,
} from "@/lib/content/related-docs";
import type { ModuleRecord } from "@/lib/content/schemas";

export function RelatedDocs({ registryId }: { registryId: string }) {
  const messages = useOptionalPageMessages();
  const pageContext = useOptionalPageMessagesContext();
  const source = getRegistryRecordById(registryId);
  if (!source) {
    return null;
  }

  const candidates = listRelatedRegistryRecords();
  const publishedRegistryIds = getPublishedDocsRegistryIds();
  const curatedItems = applyRelatedDocMessageOverrides(
    deriveCuratedRelatedItems(source, candidates, publishedRegistryIds),
    messages,
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

  const visibleVariantGroupItems = pageContext
    ? variantGroupItems.filter(
        (item) =>
          !item.href ||
          isLocalizedDocsHrefVisible(item.href, pageContext.locale),
      )
    : variantGroupItems;
  const visibleCuratedItems = pageContext
    ? curatedItems.filter(
        (item) =>
          !item.href ||
          isLocalizedDocsHrefVisible(item.href, pageContext.locale),
      )
    : curatedItems;

  if (
    visibleVariantGroupItems.length === 0 &&
    visibleCuratedItems.length === 0
  ) {
    return null;
  }

  return (
    <>
      {visibleVariantGroupItems.length > 0 ? (
        <div className="my-4" data-testid="variant-group-related-docs">
          <RelatedDocList
            items={visibleVariantGroupItems}
            groupId={SAME_VARIANT_GROUP}
          />
        </div>
      ) : null}
      {visibleCuratedItems.length > 0 ? (
        <div className="my-4" data-testid="curated-related-docs">
          <RelatedDocList
            items={visibleCuratedItems}
            testId="curated-related-docs"
          />
        </div>
      ) : null}
    </>
  );
}
