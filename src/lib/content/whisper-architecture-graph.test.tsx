import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import whisperMessages from "@/content/docs/models/whisper/messages/en.json";
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

const MODEL_SLUG = "whisper";
const GRAPH_ID = "graph.whisper-architecture";

const whisperAssets = {
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
    <PageMessagesProvider messages={whisperMessages} isDev={false}>
      <PageAssetsProvider assets={whisperAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={whisperMessages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("Whisper architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes audio-to-text encoder-decoder flow", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("transcription-output");

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "audio-input",
        "spectrogram-features",
        "audio-encoder",
        "cross-attention",
        "text-decoder",
        "text-tokens",
        "transcription-output",
        "translation-output",
      ]),
    );
    expect(graph.edges.length).toBeGreaterThanOrEqual(8);
  });

  test("buildRegistryFlowGraph resolves cross-attention and spectrogram emphasis", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const crossAttentionNode = graph.nodes.find(
      (node) => node.id === "cross-attention",
    );
    const spectrogramNode = graph.nodes.find(
      (node) => node.id === "spectrogram-features",
    );

    expect(crossAttentionNode?.registryId).toBe("module.cross-attention");
    expect(spectrogramNode?.registryId).toBe("concept.representation");
    expect(
      resolveGraphNodeLabel(
        whisperMessages,
        crossAttentionNode?.labelKey ?? "",
      ),
    ).toBe("Cross-\nAttention");
    expect(
      resolveGraphNodeLabel(whisperMessages, spectrogramNode?.labelKey ?? ""),
    ).toBe("Spectrogram-\nLike Features");

    const { nodes } = buildRegistryFlowGraph(graph, whisperMessages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Cross-\nAttention");
    expect(labels).toContain("Spectrogram-\nLike Features");
    expect(labels).toContain("Transcription\nText");
    expect(labels).toContain("Translation\nText");
    expect(labels).toContain("Audio\nInput");
  });

  test("RegistryGraphFlow renders readable audio-to-text markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={whisperMessages} isDev={false}>
        <PageAssetsProvider assets={whisperAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={whisperMessages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="cross-attention"');
    expect(html).toContain('data-graph-node-id="spectrogram-features"');
    expect(html).toContain('data-graph-node-id="audio-input"');
    expect(html).toContain("Cross-");
    expect(html).toContain("Spectrogram");
    expect(html).toContain("Transcription");
    expect(html).toContain(
      "Whisper architecture diagram showing audio waveforms converted into spectrogram-like features",
    );
  });

  test("hydrated graph exposes cross-attention and audio input labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Whisper architecture diagram showing audio waveforms converted into spectrogram-like features/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="cross-attention"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="audio-input"]'),
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

    expect(page.messages.sections?.architecture.body).toContain("encoder");
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Cross-");
    expect(html).toContain("Spectrogram");
    expect(html).toContain("Transcription");
    expect(html).toContain("Translation");
  });
});
