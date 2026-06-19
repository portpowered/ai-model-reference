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
import { SPARSE_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";
import {
  assertSparseAttentionChromeConvergence,
  assertSparseAttentionGraphThemeConvergence,
  assertSparseAttentionMathDefinitionsConvergence,
  assertSparseAttentionModuleConvergence,
  assertSparseAttentionSingleGraphConvergence,
} from "@/lib/verify/sparse-attention-module-convergence";

const pageDir = SPARSE_ATTENTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("sparse-attention page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Sparse Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema?.variableDefinitions?.gi?.term).toBe("M");
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
  });
});

describe("loadModulePage sparse-attention", () => {
  test("compiles MDX with local namespaces and message-driven opening copy", async () => {
    const page = await loadModulePage("sparse-attention");

    expect(page.frontmatter.registryId).toBe("module.sparse-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Sparse Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain(
      "restricts which query-key pairs participate in the softmax",
    );
    expect(html).toContain(
      "Each query position attends only to keys permitted by a sparsity mask",
    );
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain("curated");
    expect(html).toContain("Mask-limited subset");
    expect(html).toContain(
      'data-graph-id="graph.sparse-attention-time-pattern"',
    );
    expect(html).toContain('data-graph-node-id="sparse-time-current-query"');
    expect(html).toContain('data-graph-node-id="sparse-time-kv-t-1"');
    expect(assertSparseAttentionModuleConvergence(html)).toBeNull();
  });
});

describe("sparse-attention converged module page", () => {
  test("static render satisfies shared sparse presentation convergence helpers", async () => {
    const page = await loadModulePage("sparse-attention");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(assertSparseAttentionChromeConvergence(html)).toBeNull();
    expect(assertSparseAttentionSingleGraphConvergence(html)).toBeNull();
    expect(assertSparseAttentionGraphThemeConvergence(html)).toBeNull();
    expect(assertSparseAttentionMathDefinitionsConvergence(html)).toBeNull();
    expect(assertSparseAttentionModuleConvergence(html)).toBeNull();
  });
});

describe("sparse-attention page assets", () => {
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
        "graph.sparse-attention-time-pattern",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
