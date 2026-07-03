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
import { buildRegistryFlowGraph } from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModulePage } from "@/lib/content/module-page";
import {
  expectModuleComputeFlowGraphOnlyInHowItWorks,
  expectModuleTagPillListOnlyInTagsSection,
} from "@/lib/content/module-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = getDocsPageDir("modules", "u-net");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.u-net-compute-flow";

describe("u-net page messages (u-net-module-page-002)", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("U-Net");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.openingSummary).toContain("U-shaped");
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body).toContain("downsampling path");
    expect(messages.sections?.whatItIs.body).toContain("bottleneck");
    expect(messages.sections?.whatItIs.body).toContain("upsampling path");
    expect(messages.sections?.whatItIs.body).toContain("Skip connections");
    expect(messages.sections?.howItWorks.body).toContain("noisy image");
    expect(messages.sections?.howItWorks.body).toContain("timestep");
    expect(messages.sections?.howItWorks.body).toContain("noise prediction");
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "diffusion transformer block",
    );
    expect(messages.math?.encoderDecoderSchema?.formula).toContain("D(E(x))");
    expect(messages.math?.uNetDenoiseSchema?.formula).toContain("concat");
    expect(messages.assets?.computeFlow?.title).toBe(
      "U-Net denoising compute flow",
    );
    expect(messages.assets?.computeFlow?.legend?.residual?.label).toBe(
      "Skip connection",
    );
  });
});

describe("loadModulePage u-net", () => {
  test(
    "compiles MDX with local namespaces and U-shaped denoising teaching sections",
    async () => {
      const page = await loadModulePage("u-net");

      expect(page.frontmatter.registryId).toBe("module.u-net");
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.assetNamespace).toBe("local");
      expect(page.messages.title).toBe("U-Net");

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
      expect(html).toContain("downsampling path");
      expect(html).toContain("skip connections");
      expect(html).toContain("predict or remove noise");
      expect(html).not.toContain("Reader Shortcut");
      expect(html).toContain("At a glance");
      expectModuleTagPillListOnlyInTagsSection(html);
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('href="/docs/glossary/denoising-generation"');
      expect(html).toContain(
        'href="/docs/modules/diffusion-transformer-block"',
      );
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain("Ronneberger");
      expect(html).toContain('href="https://arxiv.org/abs/1505.04597"');
      expect(html).toContain('data-registry-comparison-table="true"');
      expect(html).toContain('data-table-id="table.u-net-comparison"');
      expect(html).toContain(
        'data-message-block-math="math.encoderDecoderSchema.formula"',
      );
      expect(html).toContain(
        'data-message-block-math="math.uNetDenoiseSchema.formula"',
      );
      expect(html).toContain("diffusion transformer block");
      expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
      expect(html).toContain('data-graph-id="graph.u-net-compute-flow"');
      expect(html).toContain('data-graph-legend="graph.u-net-compute-flow"');
      expect(html).toContain("U-Net denoising compute flow");
      expect(html).toContain("Skip connection");
      expect(html).toContain("Downsampling block 1");
      expect(html).toContain("Bottleneck");
      expect(html).toContain("Timestep embedding");
      expect(html).toContain("--xy-background-color:#ffffff");
      expect(html).toContain("--xy-node-color:#111827");
    },
    { timeout: 15_000 },
  );
});

describe("u-net page assets", () => {
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
      "Main down-up feature path",
    );
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});

describe("u-net page template", () => {
  test("uses ModuleAttentionSchemaComparison in math section without a second graph", () => {
    const raw = readFileSync(join(pageDir, "page.mdx"), "utf8");

    expect(raw).toContain('<Section id="math-or-compute-schema"');
    expect(raw).toContain(
      '<ModuleAttentionSchemaComparison schemaIds={["encoderDecoder", "uNetDenoise"]} />',
    );
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
  });
});

describe("u-net U-shaped denoising teaching asset (u-net-module-page-003)", () => {
  test("resolves skip connections across matching-resolution encoder and decoder stages", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const graph = getGraphById(defaultGraphId);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes, edges } = buildRegistryFlowGraph(graph, messages);
    expect(nodes).toHaveLength(9);
    expect(edges).toHaveLength(10);

    const downsampleOne = nodes.find((node) => node.id === "downsample-one");
    const downsampleTwo = nodes.find((node) => node.id === "downsample-two");
    const upsampleOne = nodes.find((node) => node.id === "upsample-one");
    const upsampleTwo = nodes.find((node) => node.id === "upsample-two");
    const denoisedOutput = nodes.find((node) => node.id === "denoised-output");

    expect(downsampleOne?.position.y).toBe(upsampleTwo?.position.y);
    expect(downsampleTwo?.position.y).toBe(upsampleOne?.position.y);
    expect(denoisedOutput?.position.y).toBeLessThan(
      upsampleTwo?.position.y ?? Number.POSITIVE_INFINITY,
    );

    const skipEdges = edges.filter(
      (edge) => edge.data?.semantic.edgeKind === "residual",
    );
    expect(skipEdges.map((edge) => edge.id).sort()).toEqual([
      "skip-down-one-up-two",
      "skip-down-two-up-one",
    ]);
    expect(skipEdges[0]?.data?.semantic).toMatchObject({
      edgeFamily: "residual",
      sourceNodeId: "downsample-one",
      targetNodeId: "upsample-two",
      interactionEnabled: false,
    });
    expect(skipEdges[1]?.data?.semantic).toMatchObject({
      edgeFamily: "residual",
      sourceNodeId: "downsample-two",
      targetNodeId: "upsample-one",
      interactionEnabled: false,
    });
  });

  test(
    "renders message-backed graph chrome with skip-connection accessibility edges",
    async () => {
      const page = await loadModulePage("u-net");
      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expect(html).toContain('data-graph-id="graph.u-net-compute-flow"');
      expect(html).toContain('data-graph-title="graph.u-net-compute-flow"');
      expect(html).toContain('data-graph-node-count="9"');
      expect(html).toContain('data-graph-node-id="noisy-image"');
      expect(html).toContain('data-graph-node-id="bottleneck"');
      expect(html).toContain('data-graph-node-id="denoised-output"');
      expect(html).toContain('data-graph-edge-id="skip-down-one-up-two"');
      expect(html).toContain('data-graph-edge-id="skip-down-two-up-one"');
      expect(html).toContain('data-graph-edge-kind="residual"');
      expect(html).toContain(
        page.messages.assets?.computeFlow?.alt ??
          "U-Net graph showing a noisy image",
      );
      expect(html).toContain("Main down-up feature path");
      expect(html).toContain("Timestep and conditioning steering");
      expect(html).toContain("registry-graph-flow w-full min-w-0");
      expect(html).toContain("max-w-full overflow-hidden");
    },
    { timeout: 15_000 },
  );
});
