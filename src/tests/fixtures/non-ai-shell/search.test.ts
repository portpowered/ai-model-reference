import { describe, expect, test } from "bun:test";
import { querySearchDocuments } from "@/lib/search/orama-index";
import type { SearchDocument } from "@/lib/search/types";
import { EMPTY_SEARCH_DOCUMENT_TOPOLOGY } from "@/lib/search/types";
import {
  buildNonAiShellFixtureBaseSearchDocuments,
  listNonAiShellFixturePages,
  nonAiShellFixtureSearchableText,
} from "./fixture";

const STOVETOP_BASICS_URL = "/fixture/docs/guides/stovetop-basics";
const APPLIANCE_CODES_URL = "/fixture/docs/reference/appliance-codes";

function fixtureSearchDocuments(): SearchDocument[] {
  return buildNonAiShellFixtureBaseSearchDocuments() as SearchDocument[];
}

async function queryFixtureSearch(query: string): Promise<SearchDocument[]> {
  return querySearchDocuments(fixtureSearchDocuments(), query);
}

describe("non-AI shell fixture search/base indexing", () => {
  test("builds generic base search documents with stable page fields and empty topology", () => {
    const pages = listNonAiShellFixturePages();
    const documents = buildNonAiShellFixtureBaseSearchDocuments();

    expect(documents).toHaveLength(pages.length);

    for (const page of pages) {
      const document = documents.find((entry) => entry.url === page.url);
      expect(document).toBeDefined();
      if (!document) {
        throw new Error(`Missing base search document for ${page.url}`);
      }

      const searchable = nonAiShellFixtureSearchableText(page);

      expect(document.id).toBe(page.url);
      expect(document.registryId).toBe(page.frontmatter.registryId);
      expect(document.url).toBe(page.url);
      expect(document.kind).toBe(page.frontmatter.kind);
      expect(document.title).toBe(page.messages.title);
      expect(document.description).toBe(page.messages.description);
      expect(document.headings).toEqual(searchable.headings);
      expect(document.bodyText).toBe(searchable.bodyText);
      expect(document.tags).toEqual(page.frontmatter.tags);
      expect(document.relatedIds).toEqual([]);
      expect(document.topology).toEqual(EMPTY_SEARCH_DOCUMENT_TOPOLOGY);
      expect(document.facets).toEqual({
        kind: page.frontmatter.kind,
        tags: page.frontmatter.tags,
      });
      expect(document.directAliases).toEqual(page.frontmatter.aliases ?? []);
      expect(document.aliases).toEqual(
        expect.arrayContaining([
          ...(page.frontmatter.aliases ?? []),
          ...page.frontmatter.tags,
        ]),
      );
    }
  });

  test("indexes fixture pages without AI registry enrichment fields", () => {
    const documents = buildNonAiShellFixtureBaseSearchDocuments();

    for (const document of documents) {
      expect(document.topology.terms).toEqual([]);
      expect(document.topology.relationships).toEqual([]);
      expect(document.topology.primaryClassification).toBeUndefined();
      expect(document.facets).not.toHaveProperty("primaryClassificationId");
      expect(document.facets).not.toHaveProperty("modelFamily");
      expect(document.facets).not.toHaveProperty("moduleType");
      expect(document.facets).not.toHaveProperty("optimizes");
    }
  });

  test.each([
    { query: "Stovetop Basics", url: STOVETOP_BASICS_URL },
    { query: "burner guide", url: STOVETOP_BASICS_URL },
    { query: "cooking", url: STOVETOP_BASICS_URL },
    { query: "Preheat and test heat", url: STOVETOP_BASICS_URL },
    { query: "Appliance Service Codes", url: APPLIANCE_CODES_URL },
    { query: "appliance lookup", url: APPLIANCE_CODES_URL },
    { query: "maintenance", url: APPLIANCE_CODES_URL },
    { query: "drain path", url: APPLIANCE_CODES_URL },
  ])("query $query returns $url", async ({ query, url }) => {
    const results = await queryFixtureSearch(query);
    expect(results.map((document) => document.url)).toContain(url);
  });
});
