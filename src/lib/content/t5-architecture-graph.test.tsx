import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import t5Messages from "@/content/docs/models/t5/messages/en.json";
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

const MODEL_SLUG = "t5";
const GRAPH_ID = "graph.t5-architecture";

const t5Assets = {
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
    <PageMessagesProvider messages={t5Messages} isDev={false}>
      <PageAssetsProvider assets={t5Assets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={t5Messages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("T5 architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes encoder-decoder text-to-text flow", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("output-text");
    expect(graph.nodes.length).toBeGreaterThanOrEqual(20);
    expect(graph.edges.length).toBeGreaterThanOrEqual(16);

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "input-text",
        "sentencepiece",
        "input-embedding",
        "encoder-stack",
        "bidirectional-mha",
        "relative-position-bias",
        "cross-attention",
        "decoder-stack",
        "masked-mha",
        "linear",
        "output-text",
      ]),
    );
  });

  test("buildRegistryFlowGraph resolves tokenization, relative position bias, and cross-attention labels", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const crossAttentionNode = graph.nodes.find(
      (node) => node.id === "cross-attention",
    );
    const relativePositionBiasNode = graph.nodes.find(
      (node) => node.id === "relative-position-bias",
    );
    const tokenizationNode = graph.nodes.find(
      (node) => node.id === "sentencepiece",
    );

    expect(crossAttentionNode?.registryId).toBe("module.cross-attention");
    expect(relativePositionBiasNode?.registryId).toBe(
      "module.t5-relative-position-bias",
    );
    expect(tokenizationNode?.registryId).toBe("module.sentencepiece");
    expect(
      resolveGraphNodeLabel(t5Messages, crossAttentionNode?.labelKey ?? ""),
    ).toBe("Cross\nAttention");
    expect(
      resolveGraphNodeLabel(
        t5Messages,
        relativePositionBiasNode?.labelKey ?? "",
      ),
    ).toBe("Relative\nPosition\nBias");
    expect(
      resolveGraphNodeLabel(t5Messages, tokenizationNode?.labelKey ?? ""),
    ).toBe("SentencePiece\nTokenization");

    const { nodes } = buildRegistryFlowGraph(graph, t5Messages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Cross\nAttention");
    expect(labels).toContain("Relative\nPosition\nBias");
    expect(labels).toContain("SentencePiece\nTokenization");
    expect(labels).toContain("Bidirectional\nMulti-Head\nAttention");
    expect(labels).toContain("Masked\nMulti-Head\nAttention");
    expect(labels).toContain("Output\nText");
  });

  test("RegistryGraphFlow renders readable encoder-decoder markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={t5Messages} isDev={false}>
        <PageAssetsProvider assets={t5Assets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={t5Messages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="cross-attention"');
    expect(html).toContain('data-graph-node-id="relative-position-bias"');
    expect(html).toContain('data-graph-node-id="sentencepiece"');
    expect(html).toContain("Cross");
    expect(html).toContain("Relative");
    expect(html).toContain("SentencePiece");
    expect(html).toContain(
      "T5 architecture diagram with input text tokenized by SentencePiece",
    );
  });

  test("hydrated graph exposes cross-attention and relative position bias labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /T5 architecture diagram with input text tokenized by SentencePiece/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="cross-attention"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="relative-position-bias"]'),
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
      "relative position bias",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Cross");
    expect(html).toContain("Relative");
    expect(html).toContain("SentencePiece");
  });
});
