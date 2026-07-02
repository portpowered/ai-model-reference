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
import { getDocsPageDir } from "@/lib/content/content-paths";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";
import {
  assertGroupedQueryAttentionChromeConvergence,
  assertGroupedQueryAttentionGraphThemeConvergence,
  assertGroupedQueryAttentionMathDefinitionsConvergence,
  assertGroupedQueryAttentionModuleConvergence,
  assertGroupedQueryAttentionSingleGraphConvergence,
} from "@/lib/verify/grouped-query-attention-module-convergence";

const pageDir = getDocsPageDir("modules", "grouped-query-attention");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("grouped-query-attention page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Grouped-Query Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema?.variableDefinitions?.gi?.term).toBe(
      "g(i)",
    );
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
  });
});

describe("loadModulePage grouped-query-attention", () => {
  test("compiles MDX with local namespaces and message-driven opening copy", async () => {
    const page = await loadModulePage("grouped-query-attention");

    expect(page.frontmatter.registryId).toBe("module.grouped-query-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Grouped-Query Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(page.messages.openingSummary).toContain(
      "cutting key-value cache size",
    );
    expectHtmlToContainProse(
      html,
      "Grouped-query attention (GQA) is an attention variant derived from multi-head attention.",
    );
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain("curated");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Ainslie, Joshua, et al.");
    expect(html).toContain('href="https://arxiv.org/abs/2305.13245"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("single shared");
    expect(assertGroupedQueryAttentionModuleConvergence(html)).toBeNull();
  });
});

describe("grouped-query-attention converged Phase 1 module page", () => {
  test("static render satisfies shared GQA presentation convergence helpers", async () => {
    const page = await loadModulePage("grouped-query-attention");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(assertGroupedQueryAttentionChromeConvergence(html)).toBeNull();
    expect(assertGroupedQueryAttentionSingleGraphConvergence(html)).toBeNull();
    expect(assertGroupedQueryAttentionGraphThemeConvergence(html)).toBeNull();
    expect(
      assertGroupedQueryAttentionMathDefinitionsConvergence(html),
    ).toBeNull();
    expect(assertGroupedQueryAttentionModuleConvergence(html)).toBeNull();
  });
});

describe("grouped-query-attention page assets", () => {
  test("resolves graph and table assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
