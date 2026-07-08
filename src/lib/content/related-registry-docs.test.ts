import { describe, expect, test } from "bun:test";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import { resolveRelatedRegistryDocs } from "@/lib/content/related-registry-docs";
import {
  RELATED_REGISTRY_DOCS_MISSING_ID,
  relatedRegistryDocsDraftModule,
  relatedRegistryDocsGqa,
  relatedRegistryDocsMqa,
  relatedRegistryDocsResolveOptions,
} from "@/lib/content/related-registry-docs.test-fixtures";

describe("resolveRelatedRegistryDocs", () => {
  test("returns link-ready items for published registry ids in input order", () => {
    const result = resolveRelatedRegistryDocs(
      [relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id],
      relatedRegistryDocsResolveOptions,
    );

    expect(result.unavailable).toEqual([]);
    expect(result.available.map((item) => item.registryId)).toEqual([
      relatedRegistryDocsMqa.id,
      relatedRegistryDocsGqa.id,
    ]);
    expect(result.available[0]).toEqual({
      registryId: relatedRegistryDocsMqa.id,
      title: "Multi-Query Attention",
      href: "/docs/modules/multi-query-attention",
    });
    expect(result.available[1]).toEqual({
      registryId: relatedRegistryDocsGqa.id,
      title: "Grouped Query Attention",
      href: "/docs/modules/grouped-query-attention",
    });
  });

  test("marks missing registry ids as unavailable without throwing", () => {
    const result = resolveRelatedRegistryDocs(
      [RELATED_REGISTRY_DOCS_MISSING_ID, relatedRegistryDocsGqa.id],
      relatedRegistryDocsResolveOptions,
    );

    expect(result.available).toEqual([
      {
        registryId: relatedRegistryDocsGqa.id,
        title: "Grouped Query Attention",
        href: "/docs/modules/grouped-query-attention",
      },
    ]);
    expect(result.unavailable).toEqual([
      {
        registryId: RELATED_REGISTRY_DOCS_MISSING_ID,
        reason: "missing",
      },
    ]);
  });

  test("treats registry records without published docs pages as unavailable", () => {
    const result = resolveRelatedRegistryDocs(
      [relatedRegistryDocsDraftModule.id, relatedRegistryDocsGqa.id],
      relatedRegistryDocsResolveOptions,
    );

    expect(result.available).toEqual([
      {
        registryId: relatedRegistryDocsGqa.id,
        title: "Grouped Query Attention",
        href: "/docs/modules/grouped-query-attention",
      },
    ]);
    expect(result.unavailable).toEqual([
      {
        registryId: relatedRegistryDocsDraftModule.id,
        reason: "unpublished",
      },
    ]);
  });

  test("preserves unavailable reporting order and filters only published links", () => {
    const result = resolveRelatedRegistryDocs(
      [
        RELATED_REGISTRY_DOCS_MISSING_ID,
        relatedRegistryDocsMqa.id,
        relatedRegistryDocsDraftModule.id,
        relatedRegistryDocsGqa.id,
      ],
      relatedRegistryDocsResolveOptions,
    );

    expect(result.available.map((item) => item.registryId)).toEqual([
      relatedRegistryDocsMqa.id,
      relatedRegistryDocsGqa.id,
    ]);
    expect(result.unavailable).toEqual([
      {
        registryId: RELATED_REGISTRY_DOCS_MISSING_ID,
        reason: "missing",
      },
      {
        registryId: relatedRegistryDocsDraftModule.id,
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
