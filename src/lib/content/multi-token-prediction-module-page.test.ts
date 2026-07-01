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
import { MULTI_TOKEN_PREDICTION_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import {
  expectModuleComputeFlowGraphOnlyInHowItWorks,
  expectModuleTagPillListOnlyInTagsSection,
} from "@/lib/content/module-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = MULTI_TOKEN_PREDICTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.multi-token-prediction-mtp-comparison";

describe("multi-token-prediction page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Multi-Token Prediction");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(
      messages.math?.nextTokenSchema?.variableDefinitions?.n,
    ).toBeUndefined();
    expect(messages.math?.mtpSchema?.variableDefinitions?.n?.term).toBe("N");
    expect(
      messages.math?.nextTokenSchema?.variableDefinitions?.xtplus1?.term,
    ).toBe("x_{t+1}");
  });
});

describe("loadModulePage multi-token-prediction", () => {
  test("compiles MDX with local namespaces and paper-style target comparison graph", async () => {
    const page = await loadModulePage("multi-token-prediction");

    expect(page.frontmatter.registryId).toBe("module.multi-token-prediction");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Multi-Token Prediction");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("independent output heads on a shared trunk");
    expect(html).toContain("offsets t+1 through t+N");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).toContain("At a glance");
    expectModuleTagPillListOnlyInTagsSection(html);
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/systems/speculative-decoding"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Gloeckle");
    expect(html).toContain('href="https://arxiv.org/abs/2404.19737"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain(
      'data-table-id="table.multi-token-prediction-comparison"',
    );
    expect(html).toContain(
      'data-message-block-math="math.nextTokenSchema.formula"',
    );
    expect(html).toContain('data-message-block-math="math.mtpSchema.formula"');
    expect(html).toContain('data-math-variable-definition="n"');
    expect(html).toContain('data-math-variable-definition="xtplus1"');
    expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="mtp"');
    expect(html).toContain('data-attention-variant-option="nextToken"');
    expect(html).toContain('data-attention-variant-option="mtp"');
    expect(html).toContain("--xy-background-color:#ffffff");
    expect(html).toContain("--xy-node-color:#111827");
    expect(html).toContain("--xy-node-background-color:#ffffff");
    expect(html).toContain("--xy-node-border-color:#cbd5e1");
    expect(html).toContain("sample efficiency");
    expect(html).toContain("output-head complexity");
  });
});

describe("multi-token-prediction page assets", () => {
  test("resolves graph and table assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.defaultVariantId).toBe("mtp");
      expect(
        assets.computeFlow.variants.map((variant) => variant.variantId),
      ).toEqual(["nextToken", "mtp"]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});

describe("multi-token-prediction page template", () => {
  test("uses ModuleAttentionSchemaComparison in math section without a second graph", () => {
    const raw = readFileSync(join(pageDir, "page.mdx"), "utf8");

    expect(raw).toContain('<Section id="math-or-compute-schema"');
    expect(raw).toContain(
      '<ModuleAttentionSchemaComparison schemaIds={["nextToken", "mtp"]} />',
    );
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
  });
});
