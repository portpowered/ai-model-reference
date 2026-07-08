import type { ResolveRelatedRegistryDocsOptions } from "@/lib/content/related-registry-docs";
import type { ModuleRecord } from "@/lib/content/schemas";

export const RELATED_REGISTRY_DOCS_PUBLISHED_IDS = new Set([
  "module.grouped-query-attention",
  "module.multi-query-attention",
]);

export const relatedRegistryDocsGqa: ModuleRecord = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  kind: "module",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["Grouped Query Attention"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  moduleType: "attention",
  variantGroup: "attention-head-sharing",
  optimizes: [],
  exampleModelIds: [],
  improvesOnIds: [],
  tradeoffIds: [],
  usedByModelIds: [],
  introducedByPaperIds: [],
  mathLevel: "light",
};

export const relatedRegistryDocsMqa: ModuleRecord = {
  ...relatedRegistryDocsGqa,
  id: "module.multi-query-attention",
  slug: "multi-query-attention",
  aliases: ["Multi-Query Attention"],
};

export const relatedRegistryDocsDraftModule: ModuleRecord = {
  ...relatedRegistryDocsGqa,
  id: "module.draft-attention",
  slug: "draft-attention",
  aliases: ["Draft attention"],
  status: "draft",
};

/** Published registry record that is not yet in the published-docs index. */
export const relatedRegistryDocsUnindexedModule: ModuleRecord = {
  ...relatedRegistryDocsGqa,
  id: "module.unindexed-attention",
  slug: "unindexed-attention",
  aliases: ["Unindexed attention"],
  status: "published",
};

export const relatedRegistryDocsRecordsById = new Map<string, ModuleRecord>([
  [relatedRegistryDocsGqa.id, relatedRegistryDocsGqa],
  [relatedRegistryDocsMqa.id, relatedRegistryDocsMqa],
  [relatedRegistryDocsDraftModule.id, relatedRegistryDocsDraftModule],
  [relatedRegistryDocsUnindexedModule.id, relatedRegistryDocsUnindexedModule],
]);

export const relatedRegistryDocsResolveOptions: ResolveRelatedRegistryDocsOptions =
  {
    publishedRegistryIds: RELATED_REGISTRY_DOCS_PUBLISHED_IDS,
    getRecordById: (registryId) =>
      relatedRegistryDocsRecordsById.get(registryId),
  };

export const RELATED_REGISTRY_DOCS_MISSING_ID = "module.missing-runtime-record";
