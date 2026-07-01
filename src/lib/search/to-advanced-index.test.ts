import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "./build-documents";
import {
  toAdvancedSearchIndex,
  toAdvancedSearchIndexes,
} from "./to-advanced-index";
import { toStructuredData } from "./to-structured-data";

const GQA_URL = "/docs/modules/grouped-query-attention";
const TOKEN_GLOSSARY_URL = "/docs/glossary/token";

async function loadGroupedQueryAttentionDocument() {
  const registry = await loadRegistry();
  const pages = await loadPublishedDocsPages("en");
  const documents = buildSearchDocuments(pages, registry);
  const gqa = documents.find((document) => document.url === GQA_URL);

  expect(gqa).toBeDefined();
  if (!gqa) {
    throw new Error("Missing grouped-query attention search document");
  }

  return gqa;
}

describe("toAdvancedSearchIndex", () => {
  test("projects id, title, description, url, structuredData, and tag fields for enriched documents", async () => {
    const gqa = await loadGroupedQueryAttentionDocument();
    const advanced = toAdvancedSearchIndex(gqa);

    expect(advanced.id).toBe(gqa.id);
    expect(advanced.title).toBe(gqa.title);
    expect(advanced.description).toBe(gqa.description);
    expect(advanced.url).toBe(gqa.url);
    expect(advanced.tag).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
    expect(advanced.structuredData).toEqual(toStructuredData(gqa));
    expect(advanced.structuredData.headings.length).toBeGreaterThan(0);
    expect(advanced.structuredData.contents[0]?.heading).toBe(gqa.title);
    expect(
      advanced.structuredData.contents.some((entry) =>
        entry.content.includes("GQA"),
      ),
    ).toBe(true);
  });

  test("omits tag when the source document has no tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry).map((document) => ({
      ...document,
      tags: [],
    }));
    const token = documents.find(
      (document) => document.url === TOKEN_GLOSSARY_URL,
    );

    expect(token).toBeDefined();
    if (!token) {
      throw new Error("Missing token glossary search document");
    }

    expect(toAdvancedSearchIndex(token).tag).toBeUndefined();
  });
});

describe("toAdvancedSearchIndexes", () => {
  test("maps every search document through the advanced index contract", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const indexes = toAdvancedSearchIndexes(documents);

    expect(indexes).toHaveLength(documents.length);

    for (const [position, advancedIndex] of indexes.entries()) {
      const source = documents[position];
      expect(source).toBeDefined();
      if (!source) {
        throw new Error(`Missing search document at index ${position}`);
      }

      expect(advancedIndex.id).toBe(source.id);
      expect(advancedIndex.title).toBe(source.title);
      expect(advancedIndex.description).toBe(source.description);
      expect(advancedIndex.url).toBe(source.url);
      expect(advancedIndex.structuredData).toEqual(toStructuredData(source));
      if (source.tags.length > 0) {
        expect(advancedIndex.tag).toEqual(source.tags);
      } else {
        expect(advancedIndex.tag).toBeUndefined();
      }
    }
  });
});
