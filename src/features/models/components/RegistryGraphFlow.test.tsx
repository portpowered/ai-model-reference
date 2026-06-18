import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import {
  GraphNodeLabel,
  RegistryGraphFlow,
} from "@/features/models/components/RegistryGraphFlow";
import { REGISTRY_GRAPH_FLOW_INTERACTION } from "@/features/models/components/registry-graph-flow-theme";
import {
  buildRegistryFlowGraph,
  GraphRenderIssueError,
} from "@/lib/content/graph-flow";
import type {
  GraphRecord,
  PageAssetConfig,
  PageMessages,
} from "@/lib/content/schemas";

const messages = {
  title: "Grouped-Query Attention",
  description: "GQA module page",
  assets: {
    computeFlow: {
      alt: "Grouped-query attention compute flow",
      caption: "Query groups route to shared KV heads during attention",
    },
    computeSchema: {
      alt: "Grouped-query attention tensor grouping",
      caption: "H query heads map to G shared KV groups",
    },
  },
  graph: {
    nodes: {
      hiddenStates: { label: "Hidden states" },
      queryProjection: { label: "H query heads (Q projection)" },
      queryGroups: { label: "G query groups" },
      sharedKv: { label: "Shared KV heads per group" },
      attentionScores: { label: "Attention scores per query head" },
      outputProjection: { label: "Output projection" },
      queryHeads: { label: "H query heads" },
      queryGroupsSchema: { label: "G groups (H/G query heads each)" },
      sharedKeyHeads: { label: "G shared key heads" },
      sharedValueHeads: { label: "G shared value heads" },
      kvCache: { label: "KV cache (G keys + G values per token)" },
    },
  },
} satisfies PageMessages;

const assets = {
  computeFlow: {
    type: "graph",
    graphId: "graph.grouped-query-attention-compute-flow",
    webRenderer: "react-flow",
    printRenderer: "mermaid",
    altKey: "assets.computeFlow.alt",
    captionKey: "assets.computeFlow.caption",
  },
} satisfies PageAssetConfig;

function stripHtmlTags(html: string): string {
  return html.replaceAll(/<[^>]+>/g, "");
}

describe("RegistryGraphFlow", () => {
  test("renders react-flow graph markers for the GQA compute-flow fixture", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeFlow"
            graphId="graph.grouped-query-attention-compute-flow"
            alt={messages.assets?.computeFlow?.alt}
            caption={messages.assets?.computeFlow?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-page-asset="computeFlow"');
    expect(html).toContain(
      'data-graph-id="graph.grouped-query-attention-compute-flow"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-web-renderer="react-flow"');
    expect(html).toContain("--xy-background-color:#ffffff");
    expect(html).toContain("--xy-node-color:#111827");
    expect(html).toContain("--xy-node-background-color:#ffffff");
    expect(html).toContain("--xy-node-border-color:#cbd5e1");
    expect(html).toContain(
      'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
    );
    expect(html).toContain('data-graph-interaction-pan="true"');
    expect(html).toContain('data-graph-interaction-zoom="true"');
    expect(html).toContain('data-graph-interaction-editing="false"');
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.panOnDrag).toBe(true);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnScroll).toBe(true);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnPinch).toBe(true);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.nodesDraggable).toBe(false);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.nodesConnectable).toBe(false);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.elementsSelectable).toBe(false);
    expect(html).toContain('aria-label="Grouped-query attention compute flow"');
    expect(html).toContain('aria-label="Expand graph to full screen"');
    expect(html).toContain('data-graph-node-id="hidden-states"');
    expect(html).toContain('data-graph-node-id="query-groups"');
    expect(html).toContain('data-graph-node-id="shared-kv"');
    expect(html).toContain('data-graph-node-count="6"');
    expect(html).toContain("Hidden states");
    expect(html).toContain("G query groups");
    expect(html).toContain(
      "Query groups route to shared KV heads during attention",
    );
    expect(html).not.toContain(">graph.grouped-query-attention-compute-flow<");
  });

  test("renders react-flow graph markers for the GQA compute-schema fixture", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeSchema"
            graphId="graph.grouped-query-attention-compute-schema"
            alt={messages.assets?.computeSchema?.alt}
            caption={messages.assets?.computeSchema?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-page-asset="computeSchema"');
    expect(html).toContain(
      'data-graph-id="graph.grouped-query-attention-compute-schema"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-web-renderer="react-flow"');
    expect(html).toContain(
      'aria-label="Grouped-query attention tensor grouping"',
    );
    expect(html).toContain('data-graph-node-id="query-heads"');
    expect(html).toContain('data-graph-node-id="kv-cache"');
    expect(html).toContain('data-graph-node-count="5"');
    expect(html).toContain("H query heads");
    expect(html).toContain("KV cache (G keys + G values per token)");
    expect(html).toContain("H query heads map to G shared KV groups");
    expect(html).not.toContain(
      ">graph.grouped-query-attention-compute-schema<",
    );
  });

  test("throws when graphId is unknown", () => {
    expect(() =>
      renderToStaticMarkup(
        <PageMessagesProvider messages={messages} isDev={false}>
          <PageAssetsProvider assets={assets} isDev={false}>
            <RegistryGraphFlow
              assetId="computeFlow"
              graphId="graph.missing-fixture"
              alt="Missing graph"
            />
          </PageAssetsProvider>
        </PageMessagesProvider>,
      ),
    ).toThrow(GraphRenderIssueError);
  });

  test("throws when a required graph message key is missing", () => {
    const brokenMessages = {
      ...messages,
      graph: {
        nodes: {
          hiddenStates: { label: "Hidden states" },
          queryProjection: { label: "H query heads (Q projection)" },
          queryGroups: { label: "G query groups" },
          attentionScores: { label: "Attention scores per query head" },
          outputProjection: { label: "Output projection" },
        },
      },
    } satisfies PageMessages;

    expect(() =>
      renderToStaticMarkup(
        <PageMessagesProvider messages={brokenMessages} isDev={false}>
          <PageAssetsProvider assets={assets} isDev={false}>
            <RegistryGraphFlow
              assetId="computeFlow"
              graphId="graph.grouped-query-attention-compute-flow"
              alt="Broken graph"
            />
          </PageAssetsProvider>
        </PageMessagesProvider>,
      ),
    ).toThrow(GraphRenderIssueError);
  });

  test("renders formula-like graph labels with KaTeX", () => {
    const html = renderToStaticMarkup(
      <GraphNodeLabel label={"\\phi(K)^{\\top} V"} />,
    );

    expect(html).toContain("registry-graph-flow__math-label");
    expect(html).toContain("katex");
    expect(html).toContain("\\phi(K)^{\\top} V");
  });

  test("keeps mixed prose labels as plain text so spaces remain readable", () => {
    const html = renderToStaticMarkup(
      <GraphNodeLabel label="Wide projection W_1" />,
    );

    expect(html).toContain("registry-graph-flow__math-label");
    expect(stripHtmlTags(html)).toContain("Wide projection");
    expect(html).toContain("W_1");
  });

  test("renders inline math tokens inside prose labels", () => {
    const html = renderToStaticMarkup(
      <GraphNodeLabel label="Token state h_t" />,
    );

    expect(stripHtmlTags(html)).toContain("Token state");
    expect(html).toContain("registry-graph-flow__math-label");
    expect(html).toContain("h_t");
  });

  test("preserves explicit size and architecture visual roles for container-style nodes", () => {
    const graph = {
      id: "graph.architecture-fixture",
      slug: "architecture-fixture",
      kind: "graph",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: [],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
      subjectId: "model.gpt-3",
      graphType: "model-architecture",
      rootNodeId: "container",
      layout: "vertical-expandable",
      defaultExpandedDepth: 1,
      supportedRenderers: ["react-flow"],
      nodes: [
        {
          id: "container",
          labelKey: "graph.nodes.container.label",
          moduleKind: "block",
          position: { x: 0, y: 0 },
          size: { width: 320, height: 180 },
          visualRole: "group-container",
          zIndex: 0,
          childNodeIds: [],
        },
        {
          id: "attention",
          labelKey: "graph.nodes.attention.label",
          moduleKind: "attention",
          position: { x: 32, y: 42 },
          size: { width: 180, height: 72 },
          visualRole: "architecture-attention",
          zIndex: 2,
          childNodeIds: [],
        },
      ],
      edges: [],
    } satisfies GraphRecord;

    const graphMessages = {
      title: "Fixture",
      description: "Fixture",
      graph: {
        nodes: {
          container: { label: " " },
          attention: { label: "Masked\nMulti-Head\nAttention" },
        },
      },
    } satisfies PageMessages;

    const { nodes } = buildRegistryFlowGraph(graph, graphMessages);
    expect(nodes[0]?.style).toMatchObject({ width: 320, height: 180 });
    expect(nodes[0]?.data.visualRole).toBe("group-container");
    expect(nodes[1]?.style).toMatchObject({ width: 180, height: 72 });
    expect(nodes[1]?.data.visualRole).toBe("architecture-attention");
  });
});
