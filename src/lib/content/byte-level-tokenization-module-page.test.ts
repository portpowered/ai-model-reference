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
import { BYTE_LEVEL_TOKENIZATION_PAGE_DIR } from "@/lib/content/content-paths";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { getTableById } from "@/lib/content/table-registry-runtime";

const pageDir = BYTE_LEVEL_TOKENIZATION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("byte-level-tokenization page messages", () => {
  test("includes required localized fields for the module page", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Byte-Level Tokenization");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(
      messages.math?.byteCoverageSchema?.variableDefinitions?.bi?.term,
    ).toBe("b_i");
    expect(
      messages.math?.bytePairMergeSchema?.variableDefinitions?.pk?.term,
    ).toBe("p_k");
  });
});

describe("loadModulePage byte-level-tokenization", () => {
  test("published docs inventory resolves the canonical route, registry id, and English messages together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/modules/byte-level-tokenization",
    );

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.byte-level-tokenization");
    expect(page?.messages.title).toBe("Byte-Level Tokenization");
    expect(page?.messages.openingSummary?.length).toBeGreaterThan(0);
  });

  test("compiles MDX with local namespaces and renders byte-level explainer content", async () => {
    const page = await loadModulePage("byte-level-tokenization");

    expect(page.frontmatter.registryId).toBe("module.byte-level-tokenization");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Byte-Level Tokenization");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("treats text as byte data first");
    expect(html).toContain("UTF-8");
    expect(html).toContain("byte pair encoding");
    expect(html).toContain("cafe");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).toContain(
      'data-graph-id="graph.byte-level-tokenization-compute-flow"',
    );
    expect(html).toContain('data-graph-node-id="byte-pieces"');
    expect(html).toContain('data-math-schema="byteCoverage"');
    expect(html).toContain('data-math-schema="bytePairMerge"');
    expect(html).toContain('href="/docs/models/gpt-3"');
  });
});

describe("byte-level-tokenization page coverage and tradeoffs (byte-level-tokenization-page-002)", () => {
  test("opening summary defines byte-level tokenization before GPT-style references", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const summary = messages.openingSummary?.toLowerCase() ?? "";

    expect(summary).toContain("byte-level tokenization");
    expect(summary).toContain("utf-8");
    expect(summary).toMatch(/emoji|code|mixed/);
    expect(summary).toMatch(/word count|token count/);
    expect(summary).not.toContain("gpt");
  });

  test("rendered page explains byte fallback coverage and tokenizer tradeoffs", async () => {
    const page = await loadModulePage("byte-level-tokenization");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectHtmlToContainProse(
      html,
      "Byte-level tokenization is a tokenizer design that treats text as byte data first.",
    );
    expect(html).toContain("emoji");
    expect(html).toContain("mixed-script");
    expect(html).toContain("word count");
    expect(html).toContain("less readable");
    expect(html).not.toContain("Reader Shortcut");

    const definitionIndex = html
      .toLowerCase()
      .indexOf("treats text as byte data");
    const gptReferenceIndex = html.toLowerCase().indexOf("gpt-style");
    expect(definitionIndex).toBeGreaterThanOrEqual(0);
    expect(gptReferenceIndex).toBeGreaterThan(definitionIndex);
  });
});

describe("byte-level-tokenization BPE relationship (byte-level-tokenization-page-003)", () => {
  test("comparison table contrasts byte fallback with BPE and nearby subword tokenizers", () => {
    const table = getTableById("table.byte-level-tokenization-comparison");
    expect(table?.columns.map((column) => column.moduleId)).toEqual([
      "module.byte-level-tokenization",
      "module.bpe",
      "module.wordpiece",
    ]);
    expect(table?.dimensions.map((dimension) => dimension.id)).toEqual([
      "primaryRole",
      "startingUnit",
      "pairsWithByteFallback",
      "mainTradeoff",
    ]);
  });

  test("rendered page explains byte fallback as the alphabet and BPE as the merge layer", async () => {
    const page = await loadModulePage("byte-level-tokenization");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectHtmlToContainProse(
      html,
      "Byte-level handling provides the fallback alphabet",
    );
    expect(html).toContain("BPE-style merge stage");
    expect(html).toContain("often appears together with");
    expect(html).toContain("rather than replacing");
    expect(html).toContain("Bytes provide guaranteed coverage");
    expect(html).toContain("provides compression into more reusable chunks");
    expect(html).toContain(
      'data-table-id="table.byte-level-tokenization-comparison"',
    );
    expect(html).toContain("BPE");
    expect(html).toContain("WordPiece");
    expect(html).toContain("Learned merge pass");
    expect(html).toContain('data-math-schema="byteCoverage"');
    expect(html).toContain('data-math-schema="bytePairMerge"');
    expect(html).toContain('href="/docs/modules/bpe"');
  });
});

describe("byte-level-tokenization page assets", () => {
  test("resolves graph assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    if (assets.computeFlow.type === "graph") {
      expect(assets.computeFlow.graphId).toBe(
        "graph.byte-level-tokenization-compute-flow",
      );
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
