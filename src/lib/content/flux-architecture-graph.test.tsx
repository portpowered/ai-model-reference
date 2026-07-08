import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fluxMessages from "@/content/docs/models/flux/messages/en.json";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import type { PageAssetConfig } from "@/lib/content/schemas";

const MODEL_SLUG = "flux";
const GRAPH_ID = "graph.flux-architecture";

const fluxAssets = {
  architectureGraph: {
    type: "graph",
    graphId: GRAPH_ID,
    webRenderer: "react-flow",
    printRenderer: "vertical-svg",
    altKey: "assets.architectureGraph.alt",
  },
} satisfies PageAssetConfig;

function renderArchitectureGraph() {
  return render(
    <PageMessagesProvider messages={fluxMessages} isDev={false}>
      <PageAssetsProvider assets={fluxAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={fluxMessages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("Flux architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes text-to-image rectified-flow generation path", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("output-image");

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "text-prompt",
        "conditioning",
        "cross-attention",
        "cfg-guidance",
        "diffusion-transformer",
        "latent-denoising",
        "image-decoder",
        "output-image",
      ]),
    );
    expect(graph.edges.length).toBeGreaterThanOrEqual(7);
  });

  test("buildRegistryFlowGraph resolves diffusion transformer and rectified-flow emphasis", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const diffusionTransformerNode = graph.nodes.find(
      (node) => node.id === "diffusion-transformer",
    );
    const latentDenoisingNode = graph.nodes.find(
      (node) => node.id === "latent-denoising",
    );

    expect(diffusionTransformerNode?.registryId).toBe(
      "module.diffusion-transformer-block",
    );
    expect(latentDenoisingNode?.registryId).toBe(
      "concept.denoising-generation",
    );
    expect(
      resolveGraphNodeLabel(
        fluxMessages,
        diffusionTransformerNode?.labelKey ?? "",
      ),
    ).toBe("Diffusion\nTransformer");
    expect(
      resolveGraphNodeLabel(fluxMessages, latentDenoisingNode?.labelKey ?? ""),
    ).toBe("Rectified Flow\nLatent Updates");

    const { nodes } = buildRegistryFlowGraph(graph, fluxMessages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Diffusion\nTransformer");
    expect(labels).toContain("Rectified Flow\nLatent Updates");
    expect(labels).toContain("Generated\nImage");
    expect(labels).toContain("Text\nPrompt");
  });

  test("RegistryGraphFlow renders readable text-to-image markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={fluxMessages} isDev={false}>
        <PageAssetsProvider assets={fluxAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={fluxMessages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="diffusion-transformer"');
    expect(html).toContain('data-graph-node-id="latent-denoising"');
    expect(html).toContain('data-graph-node-id="text-prompt"');
    expect(html).toContain("Diffusion");
    expect(html).toContain("Rectified Flow");
    expect(html).toContain("Generated");
    expect(html).toContain(
      "Flux architecture diagram showing a text prompt encoded into conditioning features",
    );
  });

  test("hydrated graph exposes diffusion transformer and rectified-flow labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Flux architecture diagram showing a text prompt encoded into conditioning features/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="diffusion-transformer"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="latent-denoising"]'),
    ).toBeTruthy();
    expect(document.querySelector(".react-flow__node")).toBeTruthy();
  });

  test("model page architecture section renders the registry-backed graph surface", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.messages.sections?.architecture.body).toContain(
      "latent image-generation pattern",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Diffusion");
    expect(html).toContain("Rectified Flow");
    expect(html).toContain("Generated");
  });
});
