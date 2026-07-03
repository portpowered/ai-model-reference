import {
  PUBLISHED_DOCS_REGISTRY_IDS,
  type PublishedDocsRegistryIds,
} from "@/lib/content/published-docs-registry-ids";
import {
  hasPublishedDocsPageForRecord,
  registryDisplayTitle,
  registryRecordHref,
} from "@/lib/content/registry-linking";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import type { RelatedRegistryRecord } from "@/lib/content/related-docs";

export type RelatedRegistryDocUnavailableReason = "missing" | "unpublished";

export type RelatedRegistryDocLinkItem = {
  registryId: string;
  title: string;
  href: string;
};

export type RelatedRegistryDocUnavailableItem = {
  registryId: string;
  reason: RelatedRegistryDocUnavailableReason;
};

export type ResolveRelatedRegistryDocsResult = {
  available: RelatedRegistryDocLinkItem[];
  unavailable: RelatedRegistryDocUnavailableItem[];
};

export type ResolveRelatedRegistryDocsOptions = {
  publishedRegistryIds?: PublishedDocsRegistryIds;
  getRecordById?: (registryId: string) => RelatedRegistryRecord | undefined;
};

/**
 * Resolves explicit registry ids to published docs-page link data.
 * Input order is preserved for both available and unavailable results.
 */
export function resolveRelatedRegistryDocs(
  registryIds: readonly string[],
  options: ResolveRelatedRegistryDocsOptions = {},
): ResolveRelatedRegistryDocsResult {
  const publishedRegistryIds =
    options.publishedRegistryIds ?? PUBLISHED_DOCS_REGISTRY_IDS;
  const getRecordById = options.getRecordById ?? getRegistryRecordById;

  const available: RelatedRegistryDocLinkItem[] = [];
  const unavailable: RelatedRegistryDocUnavailableItem[] = [];

  for (const registryId of registryIds) {
    const record = getRecordById(registryId);
    if (!record) {
      unavailable.push({ registryId, reason: "missing" });
      continue;
    }

    if (!hasPublishedDocsPageForRecord(record, publishedRegistryIds)) {
      unavailable.push({ registryId, reason: "unpublished" });
      continue;
    }

    const href = registryRecordHref(record);
    if (!href) {
      unavailable.push({ registryId, reason: "unpublished" });
      continue;
    }

    available.push({
      registryId,
      title: registryDisplayTitle(record),
      href,
    });
  }

  return { available, unavailable };
}
