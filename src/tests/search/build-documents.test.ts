import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const SAMPLE_URL = "/docs/modules/grouped-query-attention";

describe("buildSearchDocuments", () => {
  test("indexes grouped-query attention sample page with aliases and tags", () => {
    const registry = loadRegistry();
    const pages = loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const sample = documents.find((document) => document.url === SAMPLE_URL);

    expect(sample).toBeDefined();
    expect(sample?.title).toBe("Grouped-Query Attention");
    expect(sample?.description).toContain("KV cache");
    expect(sample?.aliases).toEqual(
      expect.arrayContaining([
        "GQA",
        "grouped-query attention",
        "grouped query attention",
      ]),
    );
    expect(sample?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
    expect(sample?.bodyText).toContain("GQA");
    expect(sample?.bodyText).toContain("KV-cache");
    expect(sample?.registryId).toBe("module.grouped-query-attention");
    expect(sample?.facets.moduleType).toBe("attention");
  });
});
