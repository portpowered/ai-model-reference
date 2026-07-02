import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("byte-level tokenization discovery surfaces (byte-level-tokenization-page-004)", () => {
  test("search documents carry the byte-focused phrasing and canonical aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === "/docs/modules/byte-level-tokenization",
    );

    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "byte-level tokenization",
        "byte tokenizer",
        "byte level BPE",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["tokenization"]));
    expect(document?.bodyText).toContain(
      "why some tokenizers use bytes instead of words",
    );
  });

  test.each([
    "byte-level tokenization",
    "byte tokenizer",
    "byte level BPE",
    "why bytes not words",
  ])("live search routes %s to the canonical page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results[0]?.url).toBe("/docs/modules/byte-level-tokenization");
  });

  test("token glossary and gpt-3 model pages expose navigable links to byte-level tokenization", async () => {
    const tokenPage = await loadGlossaryPage("token");
    const tokenHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: tokenPage.messages,
        assets: tokenPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: tokenPage.content,
      }),
    );
    expect(tokenHtml).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(tokenHtml).toContain('data-testid="curated-related-docs"');

    const gpt3Page = await loadModelPage("gpt-3");
    const gpt3Html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: gpt3Page.messages,
        assets: gpt3Page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: gpt3Page.content,
      }),
    );
    expect(gpt3Html).toContain('href="/docs/modules/byte-level-tokenization"');
  });
});
