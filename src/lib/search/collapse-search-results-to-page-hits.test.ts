import { describe, expect, test } from "bun:test";
import {
  collapseSearchResultsToPageHits,
  pageBaseUrl,
} from "./collapse-search-results-to-page-hits";
import type { SearchDocument } from "./types";

function documentForUrl(
  url: string,
  overrides: Partial<SearchDocument> = {},
): SearchDocument {
  return {
    id: url,
    url,
    kind: "module",
    title: "Grouped-Query Attention",
    description: "GQA module",
    bodyText: "",
    headings: [],
    aliases: ["GQA"],
    tags: ["attention"],
    relatedIds: [],
    facets: { kind: "module", tags: ["attention"] },
    topology: {
      secondaryClassificationIds: [],
      secondaryClassifications: [],
      relationships: [],
      terms: [],
    },
    ...overrides,
  };
}

describe("collapseSearchResultsToPageHits", () => {
  test("returns at most one hit per page base URL", () => {
    const moduleUrl = "/docs/modules/grouped-query-attention";
    const documentsByUrl = new Map<string, SearchDocument>([
      [moduleUrl, documentForUrl(moduleUrl)],
    ]);

    const collapsed = collapseSearchResultsToPageHits(
      [
        {
          id: moduleUrl,
          type: "page",
          url: moduleUrl,
          content: "Grouped-Query Attention",
        },
        {
          id: `${moduleUrl}-16`,
          type: "text",
          url: moduleUrl,
          content: "GQA reduces KV cache footprint",
        },
        {
          id: `${moduleUrl}-15`,
          type: "text",
          url: `${moduleUrl}#Grouped-Query Attention`,
          content: "Grouped-Query Attention",
        },
        {
          id: "/docs/glossary/module",
          type: "page",
          url: "/docs/glossary/module",
          content: "Module",
        },
        {
          id: "/docs/glossary/module-10",
          type: "text",
          url: "/docs/glossary/module#Module",
          content: "Module",
        },
      ],
      documentsByUrl,
    );

    const bases = collapsed.map((result) => pageBaseUrl(result.url));
    expect(new Set(bases).size).toBe(bases.length);
    expect(collapsed).toHaveLength(2);
    expect(collapsed.every((result) => !result.url.includes("#"))).toBe(true);
  });

  test("prefers canonical page hits and strips hash URLs", () => {
    const moduleUrl = "/docs/modules/grouped-query-attention";
    const documentsByUrl = new Map<string, SearchDocument>([
      [moduleUrl, documentForUrl(moduleUrl)],
    ]);

    const collapsed = collapseSearchResultsToPageHits(
      [
        {
          id: `${moduleUrl}-heading`,
          type: "heading",
          url: `${moduleUrl}#heading-0`,
          content: "Problem",
        },
        {
          id: `${moduleUrl}-text`,
          type: "text",
          url: `${moduleUrl}#Grouped-Query Attention`,
          content: "Grouped-Query Attention",
        },
      ],
      documentsByUrl,
    );

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toMatchObject({
      type: "page",
      url: moduleUrl,
      content: "Grouped-Query Attention",
    });
  });

  test("uses published page title when only fragment hits exist", () => {
    const moduleUrl = "/docs/modules/grouped-query-attention";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        moduleUrl,
        documentForUrl(moduleUrl, { title: "Grouped-Query Attention" }),
      ],
    ]);

    const collapsed = collapseSearchResultsToPageHits(
      [
        {
          id: `${moduleUrl}-body`,
          type: "text",
          url: moduleUrl,
          content: "KV cache footprint",
        },
        {
          id: `${moduleUrl}-fragment`,
          type: "text",
          url: `${moduleUrl}#Grouped-Query Attention`,
          content: "Grouped-Query Attention",
        },
      ],
      documentsByUrl,
    );

    expect(collapsed[0]).toMatchObject({
      type: "page",
      url: moduleUrl,
      content: "Grouped-Query Attention",
    });
  });
});
