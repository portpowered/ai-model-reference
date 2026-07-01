import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import qwen3Messages from "@/content/docs/models/qwen3-0-6b/messages/en.json";
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

const MODEL_SLUG = "qwen3-0-6b";
const GRAPH_ID = "graph.qwen3-0-6b-architecture";

const qwen3Assets = {
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
    <PageMessagesProvider messages={qwen3Messages} isDev={false}>
      <PageAssetsProvider assets={qwen3Assets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={qwen3Messages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("Qwen3-0.6B architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes dense decoder flow with grouped-query attention and no expert routing", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("output-probabilities");

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "input-tokens",
        "input-embedding",
        "grouped-query-attention",
        "dense-ffn",
        "output-probabilities",
        "repeat-marker",
      ]),
    );
    expect(nodeIds).not.toContain("moe-routing");
    expect(nodeIds).not.toContain("mixture-of-experts");
    expect(graph.edges.length).toBeGreaterThanOrEqual(10);
  });

  test("buildRegistryFlowGraph resolves grouped-query attention and dense feed-forward emphasis", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const gqaNode = graph.nodes.find(
      (node) => node.id === "grouped-query-attention",
    );
    const denseFfnNode = graph.nodes.find((node) => node.id === "dense-ffn");

    expect(gqaNode?.registryId).toBe("module.grouped-query-attention");
    expect(denseFfnNode?.registryId).toBe("module.standard-ffn");
    expect(resolveGraphNodeLabel(qwen3Messages, gqaNode?.labelKey ?? "")).toBe(
      "Grouped-Query\nAttention",
    );
    expect(
      resolveGraphNodeLabel(qwen3Messages, denseFfnNode?.labelKey ?? ""),
    ).toBe("Dense\nFeed\nForward");

    const { nodes } = buildRegistryFlowGraph(graph, qwen3Messages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Grouped-Query\nAttention");
    expect(labels).toContain("Dense\nFeed\nForward");
    expect(labels).not.toContain("Expert\nRouting");
    expect(labels).not.toContain("DeepSeekMoE");
  });

  test("RegistryGraphFlow renders readable dense-stack markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={qwen3Messages} isDev={false}>
        <PageAssetsProvider assets={qwen3Assets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={qwen3Messages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="grouped-query-attention"');
    expect(html).toContain('data-graph-node-id="dense-ffn"');
    expect(html).toContain('data-graph-node-id="input-tokens"');
    expect(html).toContain("Grouped-Query");
    expect(html).toContain("Dense");
    expect(html).toContain("N×");
    expect(html).toContain(
      "Qwen3-0.6B architecture diagram with token embeddings, RoPE position encoding, a repeated decoder block containing grouped-query attention",
    );
  });

  test("hydrated graph exposes grouped-query attention and dense feed-forward labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Qwen3-0\.6B architecture diagram with token embeddings, RoPE position encoding/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="grouped-query-attention"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="dense-ffn"]'),
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
      "grouped-query attention",
    );
    expect(page.messages.sections?.architecture.body).toContain(
      "without implying sparse expert routing",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Grouped-Query");
    expect(html).toContain("Dense");
    expect(html).not.toContain("Expert\nRouting");
  });
});
