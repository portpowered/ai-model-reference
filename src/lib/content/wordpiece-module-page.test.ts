import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { WORDPIECE_MODULE_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = WORDPIECE_MODULE_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("wordpiece module page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("WordPiece");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.wordpieceSchema?.variableDefinitions?.tau?.term).toBe(
      "\\tau_t",
    );
  });
});

describe("loadModulePage wordpiece", () => {
  test("compiles MDX with local namespaces and message-driven WordPiece explainer copy", async () => {
    const page = await loadModulePage("wordpiece");

    expect(page.frontmatter.registryId).toBe("module.wordpiece");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("WordPiece");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(page.messages.openingSummary).toContain("subword tokenizer");
    expectHtmlToContainProse(html, "WordPiece is a subword tokenizer.");
    expect(html).toContain("play` + `##ing");
    expect(html).toContain("scoring rule");
    expect(html).toContain("older encoder-style language-model discussions");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain("byte pair encoding");
    expect(html).toContain("SentencePiece");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Devlin");
    expect(html).toContain('href="https://arxiv.org/abs/1810.04805"');
    expect(html).toContain('data-graph-id="graph.wordpiece-compute-flow"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain('data-table-id="table.bpe-comparison"');
    expect(html).toContain('data-rich-content-scroll="table"');
    expect(html).toContain("registry-comparison-table__scroll");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain(
      "Uses a scoring rule instead of raw pair frequency alone",
    );
    expect(html).toContain("Usually picks the most frequent adjacent pair");
    expect(html).toContain(
      "Trains directly on raw text without fixed word boundaries",
    );
    expect(html).toContain(
      "Usually assumes a word-like pre-tokenization step first",
    );
    expect(html).toContain('data-attention-schema-comparison="true"');
  });

  test("published route is discoverable through source and search documents", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();
    expect(pages.some((page) => page.url === "/docs/modules/wordpiece")).toBe(
      true,
    );

    const documents = buildSearchDocuments(pages, indexes);
    const wordpieceDocument = documents.find(
      (document) => document.url === "/docs/modules/wordpiece",
    );

    expect(wordpieceDocument).toBeDefined();
    expect(wordpieceDocument?.aliases).toContain("WordPiece");
    expect(wordpieceDocument?.aliases).toContain("word piece");
    expect(wordpieceDocument?.aliases).toContain("WordPiece tokenizer");
    expect(wordpieceDocument?.aliases).toContain("bert tokenizer");
    expect(wordpieceDocument?.tags).toContain("tokenization");
    expect(wordpieceDocument?.relatedIds).toContain("concept.encoder");
    expect(wordpieceDocument?.relatedIds).toContain("concept.special-tokens");
  });

  test.each([
    "WordPiece",
    "word piece",
    "wordpiece tokenizer",
    "bert tokenizer",
  ] as const)("search routes %s to the canonical WordPiece page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url.split("#")[0]).toBe("/docs/modules/wordpiece");
  });

  test("token glossary related docs link readers into WordPiece", async () => {
    const tokenPage = await loadGlossaryPage("token");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: tokenPage.messages,
        assets: tokenPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: tokenPage.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/wordpiece"');
  });
});

describe("wordpiece module page assets and registry", () => {
  test("resolves graph and table assets with message-backed copy", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });

  test("published registry record keeps tokenizer-family metadata", () => {
    const record = getRegistryRecordById("module.wordpiece");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error("expected module.wordpiece in registry runtime");
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.citationIds).toContain("citation.bert-pre-training");
  });
});
