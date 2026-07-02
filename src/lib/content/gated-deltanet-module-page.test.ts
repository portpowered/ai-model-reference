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
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import {
  expectModuleComputeFlowGraphOnlyInHowItWorks,
  expectModuleTagPillListOnlyInTagsSection,
} from "@/lib/content/module-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = getDocsPageDir("modules", "gated-deltanet");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.gated-deltanet-gdn-comparison";

describe("gated-deltanet page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Gated DeltaNet");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.openingSummary).toContain("Gated Delta Networks");
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema?.variableDefinitions?.g?.term).toBe(
      "\\alpha_t",
    );
    expect(messages.math?.gqaSchema?.variableDefinitions?.gi?.term).toBe(
      "\\beta_t",
    );
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
  });
});

describe("loadModulePage gated-deltanet", () => {
  test("compiles MDX with local namespaces and recurrent-memory teaching content", async () => {
    const page = await loadModulePage("gated-deltanet");

    expect(page.frontmatter.registryId).toBe("module.gated-deltanet");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Gated DeltaNet");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("Gated Delta Networks");
    expect(html).toContain("compact matrix-valued memory state");
    expect(html).toContain("full attention matrix");
    expect(html).toContain("accumulation-only");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
    expect(html).toContain("At a glance");
    expectModuleTagPillListOnlyInTagsSection(html);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/context-window"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/linear-attention"');
    expect(html).toContain('href="/docs/modules/sliding-window-attention"');
    expect(html).toContain('href="/docs/modules/sparse-attention"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/concepts/why-long-context-is-hard"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Yang");
    expect(html).toContain('href="https://arxiv.org/abs/2412.06464"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain('data-table-id="table.gated-deltanet-comparison"');
    expect(html).toContain('data-message-block-math="math.gqaSchema.formula"');
    expect(html).toContain("\\alpha_t");
    expect(html).toContain("Gated decay plus targeted delta-rule memory edits");
    expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
    expect(html).toContain('data-graph-node-id="gdn-delta"');
    expect(html).toContain('data-graph-node-id="gdn-gate"');
  });
});

describe("gated-deltanet page assets", () => {
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
        "graph.multi-head-attention-mha-comparison",
        "graph.gated-deltanet-gdn-comparison",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
