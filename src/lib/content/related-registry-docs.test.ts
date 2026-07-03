import { describe, expect, test } from "bun:test";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import { resolveRelatedRegistryDocs } from "@/lib/content/related-registry-docs";
import type { ModuleRecord } from "@/lib/content/schemas";

const publishedRegistryIds = new Set([
  "module.grouped-query-attention",
  "module.multi-query-attention",
]);

const gqa: ModuleRecord = {
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

const mqa: ModuleRecord = {
  ...gqa,
  id: "module.multi-query-attention",
  slug: "multi-query-attention",
  aliases: ["Multi-Query Attention"],
};

const draftModule: ModuleRecord = {
  ...gqa,
  id: "module.draft-attention",
  slug: "draft-attention",
  aliases: ["Draft attention"],
  status: "draft",
};

const recordsById = new Map<string, ModuleRecord>([
  [gqa.id, gqa],
  [mqa.id, mqa],
  [draftModule.id, draftModule],
]);

describe("resolveRelatedRegistryDocs", () => {
  test("returns link-ready items for published registry ids in input order", () => {
    const result = resolveRelatedRegistryDocs([mqa.id, gqa.id], {
      publishedRegistryIds,
      getRecordById: (registryId) => recordsById.get(registryId),
    });

    expect(result.unavailable).toEqual([]);
    expect(result.available.map((item) => item.registryId)).toEqual([
      mqa.id,
      gqa.id,
    ]);
    expect(result.available[0]).toEqual({
      registryId: mqa.id,
      title: "Multi-Query Attention",
      href: "/docs/modules/multi-query-attention",
    });
    expect(result.available[1]).toEqual({
      registryId: gqa.id,
      title: "Grouped Query Attention",
      href: "/docs/modules/grouped-query-attention",
    });
  });

  test("marks missing registry ids as unavailable without throwing", () => {
    const result = resolveRelatedRegistryDocs(
      ["module.missing-runtime-record", gqa.id],
      {
        publishedRegistryIds,
        getRecordById: (registryId) => recordsById.get(registryId),
      },
    );

    expect(result.available).toEqual([
      {
        registryId: gqa.id,
        title: "Grouped Query Attention",
        href: "/docs/modules/grouped-query-attention",
      },
    ]);
    expect(result.unavailable).toEqual([
      {
        registryId: "module.missing-runtime-record",
        reason: "missing",
      },
    ]);
  });

  test("treats registry records without published docs pages as unavailable", () => {
    const result = resolveRelatedRegistryDocs([draftModule.id, gqa.id], {
      publishedRegistryIds,
      getRecordById: (registryId) => recordsById.get(registryId),
    });

    expect(result.available).toEqual([
      {
        registryId: gqa.id,
        title: "Grouped Query Attention",
        href: "/docs/modules/grouped-query-attention",
      },
    ]);
    expect(result.unavailable).toEqual([
      {
        registryId: draftModule.id,
        reason: "unpublished",
      },
    ]);
  });

  test("preserves unavailable reporting order and filters only published links", () => {
    const result = resolveRelatedRegistryDocs(
      ["module.missing-runtime-record", mqa.id, draftModule.id, gqa.id],
      {
        publishedRegistryIds,
        getRecordById: (registryId) => recordsById.get(registryId),
      },
    );

    expect(result.available.map((item) => item.registryId)).toEqual([
      mqa.id,
      gqa.id,
    ]);
    expect(result.unavailable).toEqual([
      {
        registryId: "module.missing-runtime-record",
        reason: "missing",
      },
      {
        registryId: draftModule.id,
        reason: "unpublished",
      },
    ]);
  });

  test("resolves real published registry ids from the runtime index", () => {
    const groupedQueryAttention = getRegistryRecordById(
      "module.grouped-query-attention",
    );
    expect(groupedQueryAttention).toBeDefined();

    const result = resolveRelatedRegistryDocs([
      "module.grouped-query-attention",
    ]);

    expect(result.unavailable).toEqual([]);
    expect(result.available).toEqual([
      {
        registryId: "module.grouped-query-attention",
        title: groupedQueryAttention
          ? expect.any(String)
          : "Grouped Query Attention",
        href: "/docs/modules/grouped-query-attention",
      },
    ]);
  });
});
