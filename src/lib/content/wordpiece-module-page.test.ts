import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("wordpiece module page", () => {
  test("published docs inventory resolves the canonical route, registry id, and English messages together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.url === "/docs/modules/wordpiece");

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.wordpiece");
    expect(page?.messages.title).toBe("WordPiece");
    expect(page?.messages.openingSummary?.length).toBeGreaterThan(0);
  });

  test("renders a customer-facing WordPiece explainer with shipped related links, no placeholders, and citations", async () => {
    const page = await loadModulePage("wordpiece");

    expect(page.frontmatter.registryId).toBe("module.wordpiece");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.sections?.howItWorks.body).toContain("unhappiness");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("At a glance");
    expect(html).toContain("longest matching pieces");
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/modules/bidirectional-attention"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('href="/docs/modules/sentencepiece"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain(
      "Google&#x27;s Neural Machine Translation System: Bridging the Gap between Human and Machine Translation.",
    );
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("later story");
    expect(html).not.toContain(
      "planned - coming in a later phase to be planned",
    );
  });

  test.each([
    "WordPiece",
    "word piece",
    "wordpiece tokenizer",
  ] as const)("search ranks the canonical WordPiece page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url.split("#")[0]).toBe("/docs/modules/wordpiece");
  });

  test("search keeps the canonical WordPiece page discoverable for broader BERT tokenizer queries", async () => {
    const results = await docsSearchApi.search("BERT tokenizer");

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => result.url.split("#")[0] === "/docs/modules/wordpiece",
      ),
    ).toBe(true);
  });

  test("search documents expose tokenization aliases and related ids for the shipped page", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();
    const documents = buildSearchDocuments(pages, indexes);
    const wordpieceDocument = documents.find(
      (document) => document.url === "/docs/modules/wordpiece",
    );

    expect(wordpieceDocument).toBeDefined();
    expect(wordpieceDocument?.aliases).toContain("WordPiece");
    expect(wordpieceDocument?.aliases).toContain("word piece");
    expect(wordpieceDocument?.tags).toContain("tokenization");
    expect(wordpieceDocument?.relatedIds).toContain(
      "concept.tokenizers-overview",
    );
    expect(wordpieceDocument?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.token",
        "concept.embedding",
        "concept.encoder",
        "module.bidirectional-attention",
      ]),
    );
  });
});
