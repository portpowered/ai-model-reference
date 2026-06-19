import { describe, expect, test } from "bun:test";
import {
  findBestTitleMatchPageUrl,
  rerankSearchResults,
} from "./rerank-search-results";
import type { SearchDocument } from "./types";

function documentForUrl(
  url: string,
  overrides: Partial<SearchDocument> = {},
): SearchDocument {
  return {
    id: url,
    url,
    kind: "glossary",
    title: "Architecture",
    description: "Architecture description",
    bodyText: "",
    headings: [],
    aliases: ["model architecture"],
    tags: ["taxonomy"],
    relatedIds: [],
    facets: { kind: "glossary", tags: ["taxonomy"] },
    ...overrides,
  };
}

describe("rerankSearchResults", () => {
  test("boosts a page hit when the query matches the document title", () => {
    const architectureUrl = "/docs/glossary/architecture";
    const moduleUrl = "/docs/modules/grouped-query-attention";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        architectureUrl,
        documentForUrl(architectureUrl, { title: "Architecture" }),
      ],
      [
        moduleUrl,
        documentForUrl(moduleUrl, {
          kind: "module",
          title: "Grouped-Query Attention",
          aliases: ["GQA"],
          facets: { kind: "module", tags: ["attention"] },
        }),
      ],
    ]);

    const results = rerankSearchResults(
      "architecture",
      [
        {
          id: "module-page",
          type: "page",
          url: moduleUrl,
          content: "Grouped-Query Attention",
        },
        {
          id: "architecture-page",
          type: "page",
          url: architectureUrl,
          content: "Architecture",
        },
      ],
      documentsByUrl,
    );

    expect(results[0]?.url).toBe(architectureUrl);
  });

  test("leaves order unchanged when no title, alias, or slug match qualifies", () => {
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        "/docs/glossary/token",
        documentForUrl("/docs/glossary/token", {
          title: "Token",
          aliases: ["tokens"],
        }),
      ],
    ]);

    const original = [
      {
        id: "token-page",
        type: "page" as const,
        url: "/docs/glossary/token",
        content: "Token",
      },
      {
        id: "token-text",
        type: "text" as const,
        url: "/docs/glossary/token#body",
        content: "tokenizer",
      },
    ];

    expect(rerankSearchResults("attention", original, documentsByUrl)).toEqual(
      original,
    );
  });

  test("findBestTitleMatchPageUrl resolves slug queries", () => {
    const generativeModelUrl = "/docs/glossary/generative-model";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        generativeModelUrl,
        documentForUrl(generativeModelUrl, {
          title: "Generative Model",
        }),
      ],
    ]);

    expect(findBestTitleMatchPageUrl("generative model", documentsByUrl)).toBe(
      generativeModelUrl,
    );
  });

  test("findBestTitleMatchPageUrl prefers the concept page when concept and module share the same exact alias", () => {
    const conceptUrl = "/docs/concepts/feed-forward-network";
    const moduleUrl = "/docs/modules/feed-forward-network";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        moduleUrl,
        documentForUrl(moduleUrl, {
          kind: "module",
          title: "Feed-Forward Network",
          aliases: ["FFN", "feedforward network", "MLP block"],
          facets: { kind: "module", tags: ["feed-forward"] },
        }),
      ],
      [
        conceptUrl,
        documentForUrl(conceptUrl, {
          kind: "concept",
          title: "Feed-Forward Network",
          aliases: ["FFN", "feedforward network", "MLP block"],
          facets: { kind: "concept", tags: ["feed-forward"] },
        }),
      ],
    ]);

    expect(
      findBestTitleMatchPageUrl("feedforward network", documentsByUrl),
    ).toBe(conceptUrl);
  });
});
