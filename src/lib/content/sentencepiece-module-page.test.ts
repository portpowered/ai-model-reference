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
import { SENTENCEPIECE_MODULE_PAGE_DIR } from "@/lib/content/content-paths";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = SENTENCEPIECE_MODULE_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("sentencepiece module page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("SentencePiece");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body).toContain("raw text");
    expect(messages.sections?.howItWorks.body).toContain("whitespace");
  });
});

describe("loadModulePage sentencepiece", () => {
  test("published docs inventory resolves the canonical route, registry id, and English messages together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/modules/sentencepiece",
    );

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.sentencepiece");
    expect(page?.messages.title).toBe("SentencePiece");
    expect(page?.messages.openingSummary?.length).toBeGreaterThan(0);
  });

  test("compiles MDX with local namespaces and message-driven SentencePiece explainer copy", async () => {
    const page = await loadModulePage("sentencepiece");

    expect(page.frontmatter.registryId).toBe("module.sentencepiece");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("SentencePiece");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(page.messages.openingSummary).toContain("raw text");
    expectHtmlToContainProse(
      html,
      "SentencePiece is a tokenizer system for building subword vocabularies.",
    );
    expect(html).toContain("whitespace as part of the tokenization stream");
    expect(html).toContain("multilingual or whitespace-agnostic data");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-page-asset="comparisonTable"');
    expect(html).toContain(
      "SentencePiece keeps whitespace in the tokenization stream and can train from raw text",
    );
    expect(html).toContain('data-comparison-column="module.bpe"');
    expect(html).toContain('data-comparison-column="module.wordpiece"');
    expect(html).toContain('data-comparison-column="module.sentencepiece"');
    expect(html).toContain('data-comparison-dimension="spaceHandling"');
    expect(html).toContain(
      "Usually assumes a word-like pre-tokenization step first",
    );
    expect(html).toContain(
      "Treats spaces as regular symbols so boundaries stay explicit",
    );
    expect(html).toContain("Kudo");
    expect(html).toContain('href="https://aclanthology.org/D18-2012/"');
    expect(html).toContain('data-graph-id="graph.sentencepiece-compute-flow"');
  });

  test("published route is discoverable through source and search documents", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();
    expect(
      pages.some((page) => page.url === "/docs/modules/sentencepiece"),
    ).toBe(true);

    const documents = buildSearchDocuments(pages, indexes);
    const sentencePieceDocument = documents.find(
      (document) => document.url === "/docs/modules/sentencepiece",
    );

    expect(sentencePieceDocument).toBeDefined();
    expect(sentencePieceDocument?.aliases).toContain("SentencePiece");
    expect(sentencePieceDocument?.aliases).toContain("sentence piece");
    expect(sentencePieceDocument?.aliases).toContain("multilingual tokenizer");
    expect(sentencePieceDocument?.aliases).toContain(
      "whitespace agnostic tokenizer",
    );
    expect(sentencePieceDocument?.tags).toContain("tokenization");
    expect(sentencePieceDocument?.relatedIds).toContain("concept.token");
    expect(sentencePieceDocument?.relatedIds).toContain("module.bpe");
  });

  test.each([
    "SentencePiece",
    "sentence piece",
    "SentencePiece tokenizer",
    "multilingual tokenizer",
    "whitespace agnostic tokenizer",
  ] as const)("search ranks the canonical SentencePiece page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url.split("#")[0]).toBe("/docs/modules/sentencepiece");
  });

  test("bpe curated discovery path leads readers into the shipped SentencePiece page", () => {
    const bpe = getRegistryRecordById("module.bpe");
    if (bpe?.kind !== "module") {
      throw new Error("expected module.bpe in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      bpe,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );
    const sentencePieceItem = items.find(
      (item) => item.registryId === "module.sentencepiece",
    );

    expect(sentencePieceItem).toBeDefined();
    expect(sentencePieceItem?.href).toBe("/docs/modules/sentencepiece");
    expect(sentencePieceItem?.isPlanned).toBe(false);
    expect(sentencePieceItem?.reasonLabel).toBe("curated");

    const tokenizersOverviewItem = items.find(
      (item) => item.registryId === "concept.tokenizers-overview",
    );
    expect(tokenizersOverviewItem?.href).toBe(
      "/docs/concepts/tokenizers-overview",
    );
    expect(tokenizersOverviewItem?.isPlanned).toBe(false);
    expect(tokenizersOverviewItem?.reasonLabel).toBe("curated");
  });
});

describe("sentencepiece module page assets and registry", () => {
  test("resolves graph assets with message-backed copy", () => {
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
    const record = getRegistryRecordById("module.sentencepiece");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error("expected module.sentencepiece in registry runtime");
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.citationIds).toContain("citation.kudo-sentencepiece");
  });
});
