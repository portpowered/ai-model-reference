import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ltx23Messages from "@/content/docs/models/ltx-23/messages/en.json";
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

const MODEL_SLUG = "ltx-23";
const GRAPH_ID = "graph.ltx-23-architecture";

const ltx23Assets = {
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
    <PageMessagesProvider messages={ltx23Messages} isDev={false}>
      <PageAssetsProvider assets={ltx23Assets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={ltx23Messages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("LTX-2.3 architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes conditioning-to-denoising audio-video flow", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("sync-output");

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "text-prompt",
        "image-reference",
        "audio-reference",
        "conditioning",
        "cross-attention",
        "diffusion-transformer",
        "latent-denoising",
        "video-decoder",
        "audio-decoder",
        "sync-output",
      ]),
    );
    expect(graph.edges.length).toBeGreaterThanOrEqual(10);
  });

  test("buildRegistryFlowGraph resolves cross-attention and latent denoising emphasis", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const crossAttentionNode = graph.nodes.find(
      (node) => node.id === "cross-attention",
    );
    const latentDenoisingNode = graph.nodes.find(
      (node) => node.id === "latent-denoising",
    );

    expect(crossAttentionNode?.registryId).toBe("module.cross-attention");
    expect(latentDenoisingNode?.registryId).toBe(
      "concept.denoising-generation",
    );
    expect(
      resolveGraphNodeLabel(ltx23Messages, crossAttentionNode?.labelKey ?? ""),
    ).toBe("Cross-\nAttention");
    expect(
      resolveGraphNodeLabel(ltx23Messages, latentDenoisingNode?.labelKey ?? ""),
    ).toBe("Latent Audio-Video\nDenoising");

    const { nodes } = buildRegistryFlowGraph(graph, ltx23Messages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Cross-\nAttention");
    expect(labels).toContain("Latent Audio-Video\nDenoising");
    expect(labels).toContain("Synchronized\nVideo + Audio");
    expect(labels).toContain("Text\nPrompt");
  });

  test("RegistryGraphFlow renders readable audio-video generation markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={ltx23Messages} isDev={false}>
        <PageAssetsProvider assets={ltx23Assets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={ltx23Messages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="cross-attention"');
    expect(html).toContain('data-graph-node-id="latent-denoising"');
    expect(html).toContain('data-graph-node-id="text-prompt"');
    expect(html).toContain("Cross-");
    expect(html).toContain("Latent Audio-Video");
    expect(html).toContain("Synchronized");
    expect(html).toContain(
      "LTX-2.3 architecture diagram showing text, image, and audio references encoded into conditioning features",
    );
  });

  test("hydrated graph exposes cross-attention and latent denoising labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /LTX-2\.3 architecture diagram showing text, image, and audio references encoded into conditioning features/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="cross-attention"]'),
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
      "latent diffusion pattern",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Cross-");
    expect(html).toContain("Latent Audio-Video");
    expect(html).toContain("Synchronized");
  });
});
