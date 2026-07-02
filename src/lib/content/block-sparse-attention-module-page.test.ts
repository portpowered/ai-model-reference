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
import { BLOCK_SPARSE_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = BLOCK_SPARSE_ATTENTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("block-sparse-attention page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Block-Sparse Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema?.variableDefinitions?.g?.term).toBe("B");
    expect(messages.math?.gqaSchema?.variableDefinitions?.gi?.term).toBe("M_B");
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
  });
});

describe("loadModulePage block-sparse-attention", () => {
  test("compiles MDX with local namespaces and block-pattern teaching content", async () => {
    const page = await loadModulePage("block-sparse-attention");

    expect(page.frontmatter.registryId).toBe("module.block-sparse-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Block-Sparse Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("divides the");
    expect(html).toContain("square regions of");
    expect(html).toContain("query-key interactions");
    expect(html).toContain("The sequence is split into blocks of B");
    expect(html).toContain("Each query block can attend only to key blocks");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/context-window"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/sparse-attention"');
    expect(html).toContain('href="/docs/modules/sliding-window-attention"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/concepts/why-long-context-is-hard"');
    expect(html).toContain("Selected block-to-block regions");
    expect(html).toContain(
      'data-graph-id="graph.block-sparse-attention-time-block-pattern"',
    );
    expect(html).toContain(
      'data-graph-node-id="block-sparse-time-current-query"',
    );
    expect(html).toContain('data-graph-node-id="block-sparse-time-kv-5"');
    expect(html).toContain(
      'data-table-id="table.block-sparse-attention-comparison"',
    );
    expect(html).toContain('data-message-block-math="math.gqaSchema.formula"');
    expect(html).toContain("M_B");
  });
});

describe("block-sparse-attention page assets", () => {
  test("resolves graph and table assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-time-pattern",
        "graph.block-sparse-attention-time-block-pattern",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
