import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS } from "@/features/models/components/module-attention-math-variable-definitions";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { MULTI_HEAD_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import {
  expectModuleComputeFlowGraphOnlyInHowItWorks,
  expectModuleTagPillListOnlyInTagsSection,
} from "@/lib/content/module-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = MULTI_HEAD_ATTENTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.multi-head-attention-mha-comparison";

describe("multi-head-attention page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Multi-Head Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema).toBeUndefined();
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
  });
});

describe("loadModulePage multi-head-attention", () => {
  test("compiles MDX with local namespaces and message-driven opening copy", async () => {
    const page = await loadModulePage("multi-head-attention");

    expect(page.frontmatter.registryId).toBe("module.multi-head-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Multi-Head Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("runs that lookup in parallel");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).toContain("At a glance");
    expectModuleTagPillListOnlyInTagsSection(html);
    expect(html).toContain('href="/tags/attention"');
    const tagsSection = html.slice(html.indexOf('id="tags"'));
    expect(tagsSection).not.toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Vaswani, Ashish");
    expect(html).toContain('href="https://arxiv.org/abs/1706.03762"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain(
      'data-table-id="table.multi-head-attention-comparison"',
    );
    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
    expect(html).not.toContain(
      'data-message-block-math="math.gqaSchema.formula"',
    );
    for (const id of MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS) {
      expect(html).toContain(`data-math-variable-definition="${id}"`);
    }
    expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="mha"');
    expect(html).toContain('data-attention-variant-option="mha"');
    expect(html).toContain('data-attention-variant-option="mqa"');
    expect(html).toContain("--xy-node-color:var(--card-foreground)");
    expect(html).toContain("--xy-node-background-color:var(--card)");
  });
});

describe("multi-head-attention page assets", () => {
  test("resolves graph and table assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.defaultVariantId).toBe("mha");
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});

describe("multi-head-attention page template", () => {
  test("uses ModuleAttentionSchema in math section without a second graph", () => {
    const raw = readFileSync(join(pageDir, "page.mdx"), "utf8");

    expect(raw).toContain('<Section id="math-or-compute-schema"');
    expect(raw).toContain('<ModuleAttentionSchema schemaId="mha"');
    expect(raw).not.toContain("<ModuleAttentionSchemaComparison");
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
  });
});
