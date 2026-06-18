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
import { LINEAR_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";
import {
  assertLinearAttentionChromeConvergence,
  assertLinearAttentionGraphThemeConvergence,
  assertLinearAttentionMathDefinitionsConvergence,
  assertLinearAttentionModuleConvergence,
  assertLinearAttentionSingleGraphConvergence,
} from "@/lib/verify/linear-attention-module-convergence";

const pageDir = LINEAR_ATTENTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("linear-attention page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Linear Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItOptimizes.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema?.variableDefinitions?.g?.term).toBe("φ");
    expect(messages.math?.gqaSchema?.variableDefinitions?.gi?.term).toBe("Z");
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
  });
});

describe("loadModulePage linear-attention", () => {
  test("compiles MDX with local namespaces and message-driven opening copy", async () => {
    const page = await loadModulePage("linear-attention");

    expect(page.frontmatter.registryId).toBe("module.linear-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Linear Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("without building the full softmax score matrix");
    expect(html).toContain("Feature-map");
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
    expect(html).toContain("Near-linear O(n) per head");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Katharopoulos");
    expect(html).toContain('href="https://arxiv.org/abs/2006.16236"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(assertLinearAttentionModuleConvergence(html)).toBeNull();
  });
});

describe("linear-attention converged module page", () => {
  test("static render satisfies shared linear presentation convergence helpers", async () => {
    const page = await loadModulePage("linear-attention");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(assertLinearAttentionChromeConvergence(html)).toBeNull();
    expect(assertLinearAttentionSingleGraphConvergence(html)).toBeNull();
    expect(assertLinearAttentionGraphThemeConvergence(html)).toBeNull();
    expect(assertLinearAttentionMathDefinitionsConvergence(html)).toBeNull();
    expect(assertLinearAttentionModuleConvergence(html)).toBeNull();
  });
});

describe("linear-attention page assets", () => {
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
