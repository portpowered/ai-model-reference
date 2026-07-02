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

const pageDir = getDocsPageDir("modules", "looped-transformers");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.looped-transformers-compute-flow";

describe("looped-transformers page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Looped Transformers");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.openingSummary).toContain("Looped transformers");
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body).toContain("shared block");
    expect(messages.sections?.whatItIs.body).toContain("loop");
    expect(messages.sections?.whyItExists.body).toContain("parameter");
    expect(messages.sections?.howItWorks.body).toContain("self-attention");
    expect(messages.sections?.howItWorks.body).toContain("feed-forward");
    expect(messages.sections?.howItWorks.body).toContain("feed back");
    expect(messages.sections?.howItWorks.body).toContain("inference");
    expect(messages.sections?.howItWorks.body).toContain("fixed-point");
    expect(messages.sections?.mathOrComputeSchema.body).toContain(
      "prediction head",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "standard transformer stack",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "parameter sharing",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "compute reuse",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "fixed-point",
    );
    expect(messages.sections?.exampleArchitectures.body).toContain("ICLR 2024");
    expect(messages.sections?.exampleArchitectures.body).toContain(
      "in-context data-fitting",
    );
    expect(messages.sections?.exampleArchitectures.body).toContain(
      "one twelfth",
    );
    expect(messages.sections?.limitationsAndTradeoffs.body).toContain(
      "truncated loss",
    );
    expect(messages.sections?.limitationsAndTradeoffs.body).toContain(
      "production",
    );
    expect(messages.math?.standardStackSchema?.formula).toContain("Block");
    expect(messages.math?.loopedBlockSchema?.formula).toContain("Block");
    expect(messages.math?.loopedPredictionSchema?.formula).toContain("Head");
    expect(messages.assets?.computeFlow?.title).toBe(
      "Looped transformer compute flow",
    );
    expect(messages.assets?.computeFlow?.legend?.["control-flow"]?.label).toBe(
      "Loop iteration control",
    );
  });
});

describe("loadModulePage looped-transformers", () => {
  test(
    "compiles MDX with local namespaces and looped transformer teaching sections",
    async () => {
      const page = await loadModulePage("looped-transformers");

      expect(page.frontmatter.registryId).toBe("module.looped-transformers");
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.assetNamespace).toBe("local");
      expect(page.messages.title).toBe("Looped Transformers");

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
      expect(html).toContain("shared block");
      expect(html).toContain("transformer stack");
      expect(html).toContain("parameter sharing");
      expect(html).toContain("compute reuse");
      expect(html).toContain("in-context data-fitting");
      expect(html).toContain("out-of-distribution loop-count");
      expect(html).toContain("production language-model stacks");
      expect(html).toContain("How loop or layer depth is chosen");
      expect(html).toContain("Iterative refinement or fixed-point role");
      expect(html).not.toContain("Reader Shortcut");
      expect(html).toContain("At a glance");
      expectModuleTagPillListOnlyInTagsSection(html);
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('href="/docs/concepts/transformer-architecture"');
      expect(html).toContain('href="/docs/modules/attention"');
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain("Liu Yang");
      expect(html).toContain('href="https://arxiv.org/abs/2311.12424"');
      expect(html).toContain('data-registry-comparison-table="true"');
      expect(html).toContain(
        'data-table-id="table.looped-transformers-comparison"',
      );
      expect(html).toContain(
        'data-message-block-math="math.standardStackSchema.formula"',
      );
      expect(html).toContain(
        'data-message-block-math="math.loopedBlockSchema.formula"',
      );
      expect(html).toContain(
        'data-message-block-math="math.loopedPredictionSchema.formula"',
      );
      expect(html).toContain('data-graph-edge-id="hidden-loop-back"');
      expect(html).toContain("fixed-point solution");
      expect(html).toContain('data-math-schema="loopedPrediction"');
      expect(html).toContain('data-math-variable-definition="yhat"');
      expect(html).toContain('data-math-variable-definition="head"');
      expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
      expect(html).toContain(
        'data-graph-id="graph.looped-transformers-compute-flow"',
      );
      expect(html).toContain("Looped transformer compute flow");
      expect(html).toContain("Loop count L");
      expect(html).toContain(
        "Shared transformer block (attention + feed-forward)",
      );
      expect(html).toContain("Loop iteration control");
      expect(html).toContain('data-math-variable-definition="block"');
      expect(html).toContain('data-math-variable-definition="blockl"');
      expect(html).toContain("--xy-background-color:#ffffff");
      expect(html).toContain("--xy-node-color:#111827");
    },
    { timeout: 15_000 },
  );
});

describe("looped-transformers page assets", () => {
  test("resolves graph and table assets with message-backed alt text, title, and legend", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    if (assets.computeFlow.type === "graph") {
      expect(assets.computeFlow.graphId).toBe(defaultGraphId);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(messages.assets?.computeFlow?.caption?.length).toBeGreaterThan(0);
    expect(messages.assets?.computeFlow?.legend?.["data-flow"]?.label).toBe(
      "Hidden state computation path",
    );
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});

describe("looped-transformers page template", () => {
  test("uses ModuleAttentionSchemaComparison in math section without a second graph", () => {
    const raw = readFileSync(join(pageDir, "page.mdx"), "utf8");

    expect(raw).toContain('<Section id="math-or-compute-schema"');
    expect(raw).toContain(
      '<ModuleAttentionSchemaComparison schemaIds={["standardStack", "loopedBlock"]} />',
    );
    expect(raw).toContain(
      '<ModuleAttentionSchema schemaId="loopedPrediction" />',
    );
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
  });
});
