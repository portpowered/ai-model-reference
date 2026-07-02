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

const pageDir = getDocsPageDir("modules", "diffusion-transformer-block");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.diffusion-transformer-block-compute-flow";

describe("diffusion-transformer-block page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Diffusion Transformer Block");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.openingSummary).toContain("Diffusion Transformer");
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body).toContain("noisy image patches");
    expect(messages.sections?.whatItIs.body).toContain("latent patches");
    expect(messages.sections?.whyItExists.body).toContain("Convolutional");
    expect(messages.sections?.whyItExists.body).toContain("global");
    expect(messages.sections?.howItWorks.body).toContain("timestep");
    expect(messages.sections?.howItWorks.body).toContain("Self-attention");
    expect(messages.sections?.howItWorks.body).toContain(
      "feed-forward network",
    );
    expect(messages.sections?.howItWorks.body).toContain("Residual");
    expect(messages.sections?.limitationsAndTradeoffs.body).toContain(
      "quadratic",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "generic transformer block",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "diffusion training objective",
    );
    expect(messages.math?.genericBlockSchema?.formula).toContain("FFN");
    expect(messages.math?.ditBlockSchema?.formula).toContain("c_t");
    expect(messages.math?.ditBlockSchema?.formula).toContain("Attn");
    expect(messages.assets?.computeFlow?.title).toBe(
      "Diffusion Transformer block compute flow",
    );
    expect(messages.assets?.computeFlow?.legend?.conditioning?.label).toBe(
      "Timestep and conditioning steering",
    );
  });
});

describe("loadModulePage diffusion-transformer-block", () => {
  test(
    "compiles MDX with local namespaces and diffusion block teaching sections",
    async () => {
      const page = await loadModulePage("diffusion-transformer-block");

      expect(page.frontmatter.registryId).toBe(
        "module.diffusion-transformer-block",
      );
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.assetNamespace).toBe("local");
      expect(page.messages.title).toBe("Diffusion Transformer Block");

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
      expect(html).toContain("noisy image patches");
      expect(html).toContain(">Diffusion Transformer</a> denoiser");
      expect(html).not.toContain("Reader Shortcut");
      expect(html).toContain("At a glance");
      expectModuleTagPillListOnlyInTagsSection(html);
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('href="/docs/concepts/transformer-architecture"');
      expect(html).toContain('href="/docs/modules/attention"');
      expect(html).toContain('href="/docs/glossary/denoising-generation"');
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain("Peebles");
      expect(html).toContain('href="https://arxiv.org/abs/2212.09748"');
      expect(html).toContain('data-registry-comparison-table="true"');
      expect(html).toContain(
        'data-table-id="table.diffusion-transformer-block-comparison"',
      );
      expect(html).toContain(
        'data-message-block-math="math.genericBlockSchema.formula"',
      );
      expect(html).toContain(
        'data-message-block-math="math.ditBlockSchema.formula"',
      );
      expect(html).toContain("quadratically with patch count");
      expect(html).toContain("diffusion training objective");
      expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
      expect(html).toContain(
        'data-graph-id="graph.diffusion-transformer-block-compute-flow"',
      );
      expect(html).toContain(
        'data-graph-legend="graph.diffusion-transformer-block-compute-flow"',
      );
      expect(html).toContain(
        'data-graph-title="graph.diffusion-transformer-block-compute-flow"',
      );
      expect(html).toContain("Diffusion Transformer block compute flow");
      expect(html).toContain("Timestep and conditioning steering");
      expect(html).toContain("Patch token computation path");
      expect(html).toContain("Timestep embedding c_t");
      expect(html).toContain("Optional class or text conditioning c");
      expect(html).toContain(
        "Timestep and conditioning steer the block; they are not ordinary image tokens",
      );
      expect(html).toContain('data-math-variable-definition="ct"');
      expect(html).toContain('data-math-variable-definition="attn"');
      expect(html).toContain('data-math-variable-definition="mod"');
      expect(html).toContain("--xy-background-color:#ffffff");
      expect(html).toContain("--xy-node-color:#111827");
    },
    { timeout: 15_000 },
  );
});

describe("diffusion-transformer-block page assets", () => {
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
      "Patch token computation path",
    );
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});

describe("diffusion-transformer-block page template", () => {
  test("uses ModuleAttentionSchemaComparison in math section without a second graph", () => {
    const raw = readFileSync(join(pageDir, "page.mdx"), "utf8");

    expect(raw).toContain('<Section id="math-or-compute-schema"');
    expect(raw).toContain(
      '<ModuleAttentionSchemaComparison schemaIds={["genericBlock", "ditBlock"]} />',
    );
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
  });
});
