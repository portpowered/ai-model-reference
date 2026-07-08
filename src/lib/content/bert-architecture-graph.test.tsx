import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import bertMessages from "@/content/docs/models/bert/messages/en.json";
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

const MODEL_SLUG = "bert";
const GRAPH_ID = "graph.bert-architecture";

const bertAssets = {
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
    <PageMessagesProvider messages={bertMessages} isDev={false}>
      <PageAssetsProvider assets={bertAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={bertMessages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("BERT architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes encoder-only flow with bidirectional attention and no decoder stack", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("contextual-output");

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "wordpiece-tokens",
        "token-embedding",
        "position-embedding",
        "segment-embedding",
        "embedding-sum",
        "bidirectional-mha",
        "feed-forward",
        "contextual-output",
        "task-heads",
        "repeat-marker",
      ]),
    );
    expect(nodeIds).not.toContain("decoder-stack");
    expect(nodeIds).not.toContain("masked-mha");
    expect(graph.edges.length).toBeGreaterThanOrEqual(10);
  });

  test("buildRegistryFlowGraph resolves bidirectional attention and WordPiece input emphasis", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const bidirectionalNode = graph.nodes.find(
      (node) => node.id === "bidirectional-mha",
    );
    const wordpieceNode = graph.nodes.find(
      (node) => node.id === "wordpiece-tokens",
    );

    expect(bidirectionalNode?.registryId).toBe(
      "module.bidirectional-attention",
    );
    expect(wordpieceNode?.registryId).toBe("module.wordpiece");
    expect(
      resolveGraphNodeLabel(bertMessages, bidirectionalNode?.labelKey ?? ""),
    ).toBe("Bidirectional\nMulti-Head\nAttention");
    expect(
      resolveGraphNodeLabel(bertMessages, wordpieceNode?.labelKey ?? ""),
    ).toBe("WordPiece\nTokens");

    const { nodes } = buildRegistryFlowGraph(graph, bertMessages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Bidirectional\nMulti-Head\nAttention");
    expect(labels).toContain("WordPiece\nTokens");
    expect(labels).toContain("MLM &\nTask Heads");
    expect(labels).not.toContain("Decoder\nStack");
    expect(labels).not.toContain("Masked\nMulti-Head\nAttention");
  });

  test("RegistryGraphFlow renders readable encoder-stack markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={bertMessages} isDev={false}>
        <PageAssetsProvider assets={bertAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={bertMessages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="bidirectional-mha"');
    expect(html).toContain('data-graph-node-id="wordpiece-tokens"');
    expect(html).toContain('data-graph-node-id="task-heads"');
    expect(html).toContain("Bidirectional");
    expect(html).toContain("WordPiece");
    expect(html).toContain("N×");
    expect(html).toContain(
      "BERT architecture diagram with WordPiece tokens flowing into token, position, and segment embeddings",
    );
  });

  test("hydrated graph exposes bidirectional attention and MLM head labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /BERT architecture diagram with WordPiece tokens flowing into token, position, and segment embeddings/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="bidirectional-mha"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="task-heads"]'),
    ).toBeTruthy();
    expect(document.querySelector(".react-flow__node")).toBeTruthy();
  });

  test("model page architecture section renders the registry-backed teaching graph", async () => {
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
      "bidirectional self-attention",
    );
    expect(page.messages.sections?.architecture.body).toContain(
      "masked-language-model",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Bidirectional");
    expect(html).toContain("WordPiece");
    expect(html).not.toContain("Decoder\nStack");
  });
});
