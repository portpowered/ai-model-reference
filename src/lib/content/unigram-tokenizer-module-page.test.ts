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
import { UNIGRAM_TOKENIZER_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import {
  expectModuleComputeFlowGraphOnlyInHowItWorks,
  expectModuleTagPillListOnlyInTagsSection,
} from "@/lib/content/module-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = UNIGRAM_TOKENIZER_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.unigram-tokenizer-segmentation-flow";

describe("unigram-tokenizer page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Unigram Tokenizer");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.unigramSchema?.variableDefinitions?.x?.term).toBe(
      "x",
    );
    expect(messages.math?.bpeSchema?.variableDefinitions?.mt?.term).toBe("m_t");
  });
});

describe("loadModulePage unigram-tokenizer", () => {
  test("compiles MDX with local namespaces and message-driven opening copy", async () => {
    const page = await loadModulePage("unigram-tokenizer");

    expect(page.frontmatter.registryId).toBe("module.unigram-tokenizer");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Unigram Tokenizer");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("highest-scoring full segmentation");
    expect(html).toContain("SentencePiece-style");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).toContain("At a glance");
    expectModuleTagPillListOnlyInTagsSection(html);
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain("BPE");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Kudo, Taku, and John Richardson.");
    expect(html).toContain('href="https://arxiv.org/abs/1808.06226"');
    expect(html).toContain(
      "Sennrich, Rico, Barry Haddow, and Alexandra Birch.",
    );
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain(
      'data-table-id="table.unigram-tokenizer-comparison"',
    );
    expect(html).toContain(
      'data-message-block-math="math.unigramSchema.formula"',
    );
    expect(html).toContain('data-message-block-math="math.bpeSchema.formula"');
    expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
  });
});

describe("unigram-tokenizer page assets", () => {
  test("resolves graph and table assets with message-backed alt and captions", () => {
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
});
