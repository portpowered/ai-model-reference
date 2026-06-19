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

  test("prefers the canonical concept route when concept and module aliases both match exactly", () => {
    const conceptUrl = "/docs/concepts/rope";
    const moduleUrl = "/docs/modules/rope";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        moduleUrl,
        documentForUrl(moduleUrl, {
          kind: "module",
          title: "RoPE",
          aliases: ["RoPE", "rotary position encoding"],
          facets: { kind: "module", tags: ["position-encoding"] },
        }),
      ],
      [
        conceptUrl,
        documentForUrl(conceptUrl, {
          kind: "concept",
          title: "Rotary position encoding",
          aliases: ["RoPE", "rotary position encoding"],
          facets: { kind: "concept", tags: ["position-encoding"] },
        }),
      ],
    ]);

    expect(findBestTitleMatchPageUrl("RoPE", documentsByUrl)).toBe(conceptUrl);
  });

  test("keeps an exact title match ahead of a different page that only matches by alias", () => {
    const glossaryUrl = "/docs/glossary/context-window";
    const conceptUrl = "/docs/concepts/context-extension";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        glossaryUrl,
        documentForUrl(glossaryUrl, {
          title: "Context window",
          aliases: ["context length", "context window"],
        }),
      ],
      [
        conceptUrl,
        documentForUrl(conceptUrl, {
          kind: "concept",
          title: "Context extension",
          aliases: ["context extension", "context window"],
          facets: { kind: "concept", tags: ["context-window"] },
        }),
      ],
    ]);

    expect(findBestTitleMatchPageUrl("context window", documentsByUrl)).toBe(
      glossaryUrl,
    );
  });
});
