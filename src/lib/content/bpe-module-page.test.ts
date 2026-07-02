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
import { BPE_MODULE_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = BPE_MODULE_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("bpe module page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Byte Pair Encoding");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.bpeSchema?.variableDefinitions?.tau?.term).toBe(
      "\\tau_t",
    );
  });
});

describe("loadModulePage bpe", () => {
  test("compiles MDX with local namespaces and message-driven BPE explainer copy", async () => {
    const page = await loadModulePage("bpe");

    expect(page.frontmatter.registryId).toBe("module.bpe");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Byte Pair Encoding");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(page.messages.openingSummary).toContain("tokenizer");
    expectHtmlToContainProse(
      html,
      "Byte pair encoding (BPE) is a subword tokenizer.",
    );
    expect(html).toContain("most frequent adjacent pair");
    expect(html).toContain("low` + `er");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain("WordPiece");
    expect(html).toContain("SentencePiece");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Sennrich");
    expect(html).toContain('href="https://arxiv.org/abs/1508.07909"');
    expect(html).not.toContain("later phase");
    expect(html).toContain('data-graph-id="graph.bpe-compute-flow"');
    expect(html).toContain('data-page-asset="comparisonTable"');
    expect(html).toContain('data-table-id="table.bpe-comparison"');
    expect(html).toContain("Starting view of text");
  });

  test("published route is discoverable through source and search documents", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();
    expect(pages.some((page) => page.url === "/docs/modules/bpe")).toBe(true);

    const documents = buildSearchDocuments(pages, indexes);
    const bpeDocument = documents.find(
      (document) => document.url === "/docs/modules/bpe",
    );

    expect(bpeDocument).toBeDefined();
    expect(bpeDocument?.aliases).toContain("BPE");
    expect(bpeDocument?.aliases).toContain("byte pair encoding");
    expect(bpeDocument?.aliases).toContain("byte-pair encoding");
    expect(bpeDocument?.aliases).toContain("subword tokenizer");
    expect(bpeDocument?.tags).toContain("tokenization");
    expect(bpeDocument?.relatedIds).toContain("concept.token");
    expect(bpeDocument?.relatedIds).toContain("concept.tokenizers-overview");
    expect(bpeDocument?.relatedIds).toContain("module.wordpiece");
    expect(bpeDocument?.relatedIds).toContain("module.sentencepiece");
    expect(bpeDocument?.relatedIds).toContain("model.gpt-3");
  });

  test.each([
    "BPE",
    "byte pair encoding",
    "byte-pair encoding",
    "subword tokenizer",
  ] as const)("search ranks the canonical BPE page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url.split("#")[0]).toBe("/docs/modules/bpe");
  });

  test("search surfaces BPE among tokenizer-family results for tokenizer", async () => {
    const results = await docsSearchApi.search("tokenizer");

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => result.url.split("#")[0] === "/docs/modules/bpe",
      ),
    ).toBe(true);
  });
});

describe("bpe page focused validation", () => {
  test("loadModulePage binds the canonical route to module.bpe with English messages and local assets", async () => {
    const page = await loadModulePage("bpe");
    const pages = await loadPublishedDocsPages("en");

    expect(page.frontmatter.registryId).toBe("module.bpe");
    expect(pages.some((entry) => entry.url === "/docs/modules/bpe")).toBe(true);
    expect(page.assets.computeFlow.type).toBe("graph");
    expect(page.assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(page.assets, page.messages)).toEqual([]);
    expect(page.messages.assets?.computeFlow?.alt).toContain(
      "Byte pair encoding flow",
    );
    expect(page.messages.tables?.comparison?.dimensions?.startingView).toBe(
      "Starting view of text",
    );
  });

  test("search and related-doc surfaces route readers to the canonical BPE page", async () => {
    const results = await docsSearchApi.search("subword tokenizer");
    expect(results[0]?.url.split("#")[0]).toBe("/docs/modules/bpe");

    const page = await loadModulePage("bpe");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/modules/wordpiece"');
    expect(html).toContain('href="/docs/modules/sentencepiece"');
    expect(html).toContain('href="/docs/models/gpt-3"');
  });
});

describe("bpe module page assets and registry", () => {
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
    const record = getRegistryRecordById("module.bpe");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error("expected module.bpe in registry runtime");
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.primaryClassificationId).toBe(
      "classification.module.tokenization",
    );
    expect(record.usedByModelIds).toContain("model.gpt-3");
  });
});
