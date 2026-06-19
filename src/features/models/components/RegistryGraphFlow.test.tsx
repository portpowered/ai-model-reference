import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { type ReactElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import {
  CanonicalReferenceNode,
  FallbackNode,
  GraphNodeLabel,
  nodeVisualRoleHasHandles,
  RegistryGraphFlow,
  RegistryGraphFlowEdgePopup,
  RegistryGraphFlowInteractionContext,
  RegistryGraphFlowNodePopup,
} from "@/features/models/components/RegistryGraphFlow";
import { REGISTRY_GRAPH_FLOW_INTERACTION } from "@/features/models/components/registry-graph-flow-theme";
import {
  buildRegistryFlowEdges,
  buildRegistryFlowGraph,
  buildRegistryFlowNodeType,
  GraphRenderIssueError,
  type RegistryFlowNodeData,
  resolveRegistryFlowEdgeFamily,
  resolveRegistryFlowNodeFamily,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import type {
  GraphRecord,
  PageAssetConfig,
  PageMessages,
} from "@/lib/content/schemas";
import { pageMessagesSchema } from "@/lib/content/schemas";

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

const GPT_3_MODEL_PAGE_DIR = "src/content/docs/models/gpt-3";
const SWIGLU_MODULE_PAGE_DIR = "src/content/docs/modules/swiglu";

const gpt3Messages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(join(GPT_3_MODEL_PAGE_DIR, "messages/en.json"), "utf8"),
  ),
);

const swigluMessages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(join(SWIGLU_MODULE_PAGE_DIR, "messages/en.json"), "utf8"),
  ),
);

function stripHtmlTags(html: string): string {
  return html.replaceAll(/<[^>]+>/g, "");
}

function renderRegistryGraph(
  ui: ReactElement,
  pageMessages: PageMessages = messages,
  pageAssets: PageAssetConfig = assets,
) {
  return render(
    <PageMessagesProvider messages={pageMessages} isDev={false}>
      <PageAssetsProvider assets={pageAssets} isDev={false}>
        {ui}
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

function CanonicalNodeHarness({ data }: { data: RegistryFlowNodeData }) {
  const [activeNode, setActiveNode] = useState<{
    canonicalPageHref?: string;
    entityKind?: RegistryFlowNodeData["semantic"]["entityKind"];
    hasCanonicalPage: boolean;
    id: string;
    interactionKind: RegistryFlowNodeData["semantic"]["interactionKind"];
    relatedPageHref?: string;
    relatedPageTitle?: string;
    resolvedSummary?: string;
    resolvedTitle: string;
  } | null>(null);

  return (
    <RegistryGraphFlowInteractionContext.Provider
      value={{
        activeNodeId: activeNode?.id,
        openNodePopup: setActiveNode,
        popupId: "graph-node-popup",
      }}
    >
      <ReactFlowProvider>
        {CanonicalReferenceNode({
          id: data.semantic.registryId ?? "node",
          data,
          type: "canonicalReference",
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: false,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
          xPos: 0,
          yPos: 0,
          draggingHandle: null,
          targetPosition: undefined,
          sourcePosition: undefined,
          width: 220,
          height: 82,
          parentId: undefined,
          dragHandle: undefined,
        } as never)}
      </ReactFlowProvider>
      <RegistryGraphFlowNodePopup
        activeNode={activeNode}
        onClose={() => setActiveNode(null)}
        popupId="graph-node-popup"
      />
    </RegistryGraphFlowInteractionContext.Provider>
  );
}

describe("RegistryGraphFlow", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

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

  test("falls back to a graph-derived accessible label when alt and caption are omitted", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeFlow"
            graphId="graph.grouped-query-attention-compute-flow"
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(
      'aria-label="Graph graph.grouped-query-attention-compute-flow"',
    );
    expect(html).not.toContain("<figcaption>");
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

  test("renders architecture graphs with container and operator visual roles", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={gpt3Messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeFlow"
            graphId="graph.gpt-3-architecture"
            alt="GPT-3 architecture"
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-graph-id="graph.gpt-3-architecture"');
    expect(html).toContain('data-graph-node-id="input-embedding"');
    expect(html).toContain('data-graph-node-id="softmax"');
    expect(html).toContain('data-graph-node-id="repeat-marker"');

    const graphRecord = getGraphById("graph.gpt-3-architecture");
    expect(graphRecord).toBeDefined();
    const { nodes } = buildRegistryFlowGraph(
      graphRecord as GraphRecord,
      gpt3Messages,
    );
    expect(nodes.some((node) => node.type === "canonicalReference")).toBe(true);
    expect(nodes.some((node) => node.type === "structural")).toBe(true);
    expect(nodes.some((node) => node.type === "architectureBlock")).toBe(true);
    expect(html).toContain(
      'data-graph-edge-id="input-tokens-to-input-embedding"',
    );
    expect(html).toContain('data-graph-edge-family="data-flow"');
  });

  test("renders timeline and annotation graph families with their node markers", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeFlow"
            graphId="graph.sliding-window-attention-time-window-pattern"
            alt="Sliding-window attention timeline"
          />
          <RegistryGraphFlow
            assetId="computeSchema"
            graphId="graph.standard-ffn-compute-flow"
            alt="Standard FFN compute flow"
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(
      'data-graph-id="graph.sliding-window-attention-time-window-pattern"',
    );
    expect(html).toContain('data-graph-node-id="window-time-current-query"');
    expect(html).toContain('data-graph-node-id="window-time-kv-ellipsis"');
    expect(html).toContain('data-graph-node-id="window-time-kv-t-1"');
    expect(html).toContain('data-graph-id="graph.standard-ffn-compute-flow"');
    expect(html).toContain('data-graph-node-id="expand-projection"');
    expect(html).toContain('data-graph-node-id="dense-note"');
    expect(html).toContain('data-graph-node-id="output-state"');
  });

  test("opens and closes the full-screen dialog from the expand button and Escape key", () => {
    renderRegistryGraph(
      <RegistryGraphFlow
        assetId="computeFlow"
        graphId="graph.grouped-query-attention-compute-flow"
        alt="Grouped-query attention compute flow"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Expand graph to full screen" }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "Grouped-query attention compute flow full-screen view",
      }),
    ).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", {
        name: "Grouped-query attention compute flow full-screen view",
      }),
    ).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  test("closes the full-screen dialog from the close button", () => {
    renderRegistryGraph(
      <RegistryGraphFlow
        assetId="computeFlow"
        graphId="graph.grouped-query-attention-compute-flow"
        alt="Grouped-query attention compute flow"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Expand graph to full screen" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Close full-screen graph" }),
    );

    expect(
      screen.queryByRole("dialog", {
        name: "Grouped-query attention compute flow full-screen view",
      }),
    ).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  test("opens canonical node popups with summary, kind, and canonical docs links", () => {
    const graph = getGraphById("graph.gpt-3-architecture");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes } = buildRegistryFlowGraph(
      graph,
      gpt3Messages as PageMessages,
    );
    const maskedMhaNode = nodes.find((node) => node.id === "masked-mha");
    expect(maskedMhaNode).toBeDefined();
    if (!maskedMhaNode) {
      return;
    }

    renderRegistryGraph(<CanonicalNodeHarness data={maskedMhaNode.data} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Open Masked\s+Multi-Head\s+Attention details/,
      }),
    );

    const popup = screen.getByRole("dialog", {
      name: /Masked\s+Multi-Head\s+Attention details/,
    });
    expect(within(popup).getByText("Module")).toBeTruthy();
    expect(within(popup).getByText("Masked Multi-Head Attention")).toBeTruthy();
    expect(
      within(popup).getByText(
        "Each token can read earlier tokens but not future ones",
      ),
    ).toBeTruthy();
    expect(
      within(popup)
        .getByRole("link", { name: "Open canonical docs page" })
        .getAttribute("href"),
    ).toBe("/docs/modules/multi-head-attention");
  });

  test("opens canonical node popups from keyboard activation", () => {
    const graph = getGraphById("graph.gpt-3-architecture");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes } = buildRegistryFlowGraph(
      graph,
      gpt3Messages as PageMessages,
    );
    const inputTokensNode = nodes.find((node) => node.id === "input-tokens");
    expect(inputTokensNode).toBeDefined();
    if (!inputTokensNode) {
      return;
    }

    renderRegistryGraph(<CanonicalNodeHarness data={inputTokensNode.data} />);

    const inputTokensButton = screen.getByRole("button", {
      name: /Open Input\s+Tokens details/,
    });
    fireEvent.keyDown(inputTokensButton, { key: "Enter" });

    expect(
      screen.getByRole("dialog", { name: /Input\s+Tokens details/ }),
    ).toBeTruthy();
  });

  test("opens graph-local fallback popups and exposes related docs destinations", () => {
    const fallbackNodeData = {
      label: "Gate branch",
      moduleKind: "operation",
      nodeFamily: "fallback",
      visualRole: "process-node",
      semantic: {
        resolvedTitle: "Gate branch",
        resolvedSummary:
          "This graph-local branch applies the SiLU gate before multiplication.",
        summarySource: "graph-local",
        hasCanonicalPage: false,
        interactionKind: "graph-local",
        relatedPageHref: "/docs/concepts/swiglu",
        relatedPageTitle: "SwiGLU",
      },
    } satisfies RegistryFlowNodeData;

    renderRegistryGraph(<CanonicalNodeHarness data={fallbackNodeData} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Open Gate branch details/ }),
    );

    const popup = screen.getByRole("dialog", {
      name: /Gate branch details/,
    });
    expect(within(popup).getByText("Graph-local explanation")).toBeTruthy();
    expect(
      within(popup).getByText(
        "This graph-local branch applies the SiLU gate before multiplication.",
      ),
    ).toBeTruthy();
    expect(
      within(popup)
        .getByRole("link", { name: "Open SwiGLU" })
        .getAttribute("href"),
    ).toBe("/docs/concepts/swiglu");
  });

  test("keeps fallback nodes non-clickable when no graph-local summary exists", () => {
    const fallbackNodeData = {
      label: "Legacy node",
      moduleKind: "other",
      nodeFamily: "fallback",
      visualRole: "timeline-node",
      semantic: {
        resolvedTitle: "Legacy node",
        summarySource: "none",
        hasCanonicalPage: false,
        interactionKind: "none",
      },
    } satisfies RegistryFlowNodeData;

    const html = renderToStaticMarkup(
      <ReactFlowProvider>
        {FallbackNode({
          id: "legacy-node",
          data: fallbackNodeData,
          type: "fallback",
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: false,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
          xPos: 0,
          yPos: 0,
          draggingHandle: null,
          targetPosition: undefined,
          sourcePosition: undefined,
          width: 180,
          height: 64,
          parentId: undefined,
          dragHandle: undefined,
        } as never)}
      </ReactFlowProvider>,
    );

    expect(html).toContain('data-graph-node-interactive="false"');
    expect(html).not.toContain('data-graph-node-button="true"');
    expect(html).not.toContain("Summary available");
  });

  test("renders dependency edge popups with relationship text and available docs links", () => {
    const graph = getGraphById("graph.swiglu-compute-flow");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { edges } = buildRegistryFlowGraph(
      graph,
      swigluMessages as PageMessages,
    );
    const dependencyEdge = edges.find(
      (edge) => edge.id === "gate-activation-to-product",
    );
    expect(dependencyEdge?.data).toBeDefined();
    if (!dependencyEdge?.data) {
      return;
    }

    renderRegistryGraph(
      <RegistryGraphFlowEdgePopup
        activeEdge={{
          id: dependencyEdge.id,
          relationshipSummary:
            dependencyEdge.data.semantic.relationshipSummary ??
            "Elementwise multiply depends on SiLU.",
          sourceTitle: dependencyEdge.data.semantic.sourceTitle,
          targetTitle: dependencyEdge.data.semantic.targetTitle,
          sourcePageHref: dependencyEdge.data.semantic.sourcePageHref,
          sourcePageTitle: dependencyEdge.data.semantic.sourcePageTitle,
          targetPageHref: dependencyEdge.data.semantic.targetPageHref,
          targetPageTitle: dependencyEdge.data.semantic.targetPageTitle,
        }}
        onClose={() => {}}
        popupId="graph-edge-popup"
      />,
      swigluMessages,
    );

    const popup = screen.getByRole("dialog", {
      name: /SiLU and Elementwise multiply relationship details/,
    });
    expect(within(popup).getByText("Dependency edge")).toBeTruthy();
    expect(
      within(popup).getByText("Elementwise multiply depends on SiLU."),
    ).toBeTruthy();
    expect(
      within(popup)
        .getByRole("link", { name: "Open SiLU" })
        .getAttribute("href"),
    ).toBe("/docs/modules/silu");
  });

  test("renders published SwiGLU proof nodes with canonical and graph-local popup behavior", () => {
    const graph = getGraphById("graph.swiglu-compute-flow");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes } = buildRegistryFlowGraph(
      graph,
      swigluMessages as PageMessages,
    );
    const swigluNode = nodes.find((node) => node.id === "swiglu-module");
    const multiplyNode = nodes.find((node) => node.id === "gated-product");
    expect(swigluNode).toBeDefined();
    expect(multiplyNode).toBeDefined();
    if (!swigluNode || !multiplyNode) {
      return;
    }

    renderRegistryGraph(
      <>
        <CanonicalNodeHarness data={swigluNode.data} />
        <CanonicalNodeHarness data={multiplyNode.data} />
      </>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Open SwiGLU details/ }),
    );

    const swigluPopup = screen.getByRole("dialog", {
      name: /SwiGLU details/,
    });
    expect(within(swigluPopup).getByText("Module")).toBeTruthy();
    expect(
      within(swigluPopup)
        .getByRole("link", { name: "Open canonical docs page" })
        .getAttribute("href"),
    ).toBe("/docs/modules/swiglu");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Open Elementwise multiply details/,
      }),
    );

    const multiplyPopup = screen.getByRole("dialog", {
      name: /Elementwise multiply details/,
    });
    expect(
      within(multiplyPopup).getByText("Graph-local explanation"),
    ).toBeTruthy();
    expect(
      within(multiplyPopup).getByText(
        "This graph-local operator multiplies the value path by the SiLU-shaped gate, which is the moment the two branches become one SwiGLU update.",
      ),
    ).toBeTruthy();
  });

  test("marks published dependency edges as interactive in the graph accessibility metadata", () => {
    renderRegistryGraph(
      <RegistryGraphFlow
        assetId="computeFlow"
        graphId="graph.swiglu-compute-flow"
        alt={swigluMessages.assets?.computeFlow?.alt}
      />,
      swigluMessages,
      {
        computeFlow: {
          type: "graph",
          graphId: "graph.swiglu-compute-flow",
          webRenderer: "react-flow",
          printRenderer: "mermaid",
          altKey: "assets.computeFlow.alt",
        },
      } satisfies PageAssetConfig,
    );

    const interactiveEdge = document.querySelector(
      '[data-graph-edge-id="gate-activation-to-product"]',
    );
    expect(interactiveEdge?.getAttribute("data-graph-edge-family")).toBe(
      "depends-on",
    );
    expect(interactiveEdge?.getAttribute("data-graph-edge-kind")).toBe(
      "depends-on",
    );
    expect(interactiveEdge?.getAttribute("data-graph-edge-interactive")).toBe(
      "true",
    );
  });

  test("marks GPT-3 dependency proof edges as interactive in the rendered graph metadata", () => {
    renderRegistryGraph(
      <RegistryGraphFlow
        assetId="architectureGraph"
        graphId="graph.gpt-3-architecture"
        alt={gpt3Messages.assets?.architectureGraph?.alt}
      />,
      gpt3Messages,
      {
        architectureGraph: {
          type: "graph",
          graphId: "graph.gpt-3-architecture",
          webRenderer: "react-flow",
          printRenderer: "vertical-svg",
          altKey: "assets.architectureGraph.alt",
        },
      } satisfies PageAssetConfig,
    );

    const interactiveEdge = document.querySelector(
      '[data-graph-edge-id="linear-to-softmax"]',
    );
    expect(interactiveEdge?.getAttribute("data-graph-edge-family")).toBe(
      "depends-on",
    );
    expect(interactiveEdge?.getAttribute("data-graph-edge-kind")).toBe(
      "depends-on",
    );
    expect(interactiveEdge?.getAttribute("data-graph-edge-interactive")).toBe(
      "true",
    );
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
    expect(nodes[0]?.data.nodeFamily).toBe("structural");
    expect(nodes[0]?.type).toBe("structural");
    expect(nodes[1]?.style).toMatchObject({ width: 180, height: 78 });
    expect(nodes[1]?.data.visualRole).toBe("architecture-attention");
    expect(nodes[1]?.data.nodeFamily).toBe("architecture-block");
    expect(nodes[1]?.type).toBe("architectureBlock");
  });

  test("allows group containers to expose edge handles for architecture graphs", () => {
    expect(nodeVisualRoleHasHandles("group-container")).toBe(true);
    expect(nodeVisualRoleHasHandles("annotation")).toBe(false);
  });

  test("classifies runtime node families and react-flow node types explicitly", () => {
    expect(
      resolveRegistryFlowNodeFamily({
        registryId: "module.masked-multi-head-attention",
      }),
    ).toBe("canonical-reference");
    expect(
      resolveRegistryFlowNodeFamily({
        visualRole: "group-container",
      }),
    ).toBe("structural");
    expect(
      resolveRegistryFlowNodeFamily({
        visualRole: "annotation",
      }),
    ).toBe("annotation");
    expect(
      resolveRegistryFlowNodeFamily({
        visualRole: "operator-circle",
      }),
    ).toBe("operator");
    expect(
      resolveRegistryFlowNodeFamily({
        visualRole: "architecture-softmax",
      }),
    ).toBe("architecture-block");
    expect(
      resolveRegistryFlowNodeFamily({
        visualRole: "timeline-node",
      }),
    ).toBe("fallback");

    expect(buildRegistryFlowNodeType("canonical-reference")).toBe(
      "canonicalReference",
    );
    expect(buildRegistryFlowNodeType("structural")).toBe("structural");
    expect(buildRegistryFlowNodeType("annotation")).toBe("annotation");
    expect(buildRegistryFlowNodeType("operator")).toBe("operator");
    expect(buildRegistryFlowNodeType("architecture-block")).toBe(
      "architectureBlock",
    );
    expect(buildRegistryFlowNodeType("fallback")).toBe("fallback");
  });

  test("classifies runtime edge families and preserves a fallback family for older supported kinds", () => {
    expect(resolveRegistryFlowEdgeFamily("data-flow")).toBe("data-flow");
    expect(resolveRegistryFlowEdgeFamily("contains")).toBe("contains");
    expect(resolveRegistryFlowEdgeFamily("residual")).toBe("residual");
    expect(resolveRegistryFlowEdgeFamily("cache-read")).toBe("cache-read");
    expect(resolveRegistryFlowEdgeFamily("cache-write")).toBe("cache-write");
    expect(resolveRegistryFlowEdgeFamily("parameter-sharing")).toBe(
      "parameter-sharing",
    );
    expect(resolveRegistryFlowEdgeFamily("depends-on")).toBe("depends-on");
    expect(resolveRegistryFlowEdgeFamily("control-flow")).toBe("fallback");
  });

  test("uses explicit edge families for supported kinds and a default fallback family for older graphs", () => {
    const graph = {
      id: "graph.edge-family-fixture",
      slug: "edge-family-fixture",
      kind: "graph",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: [],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      subjectId: "module.grouped-query-attention",
      graphType: "module-compute-flow",
      rootNodeId: "source",
      layout: "vertical-expandable",
      defaultExpandedDepth: 1,
      supportedRenderers: ["react-flow"],
      nodes: [
        {
          id: "source",
          labelKey: "graph.nodes.source.label",
          moduleKind: "input",
          childNodeIds: [],
        },
        {
          id: "target",
          labelKey: "graph.nodes.target.label",
          moduleKind: "output",
          childNodeIds: [],
        },
      ],
      edges: [
        {
          id: "depends-edge",
          source: "source",
          target: "target",
          edgeKind: "depends-on",
        },
        {
          id: "fallback-edge",
          source: "target",
          target: "source",
          edgeKind: "control-flow",
        },
      ],
    } satisfies GraphRecord;

    const graphMessages = {
      title: "Fixture",
      description: "Fixture",
      graph: {
        nodes: {
          source: { label: "Source module" },
          target: { label: "Target module" },
        },
      },
    } satisfies PageMessages;

    const { nodes } = buildRegistryFlowGraph(graph, graphMessages);
    const nodesById = new Map(nodes.map((node) => [node.id, node.data]));
    const edges = buildRegistryFlowEdges(graph, nodesById);

    expect(edges[0]).toMatchObject({
      id: "depends-edge",
      type: "interactiveDependency",
      className:
        "registry-graph-flow__edge registry-graph-flow__edge--depends-on",
      data: {
        edgeFamily: "depends-on",
        semantic: {
          edgeFamily: "depends-on",
          edgeKind: "depends-on",
          sourceTitle: "Source module",
          targetTitle: "Target module",
          relationshipSummary: "Target module depends on Source module.",
          interactionEnabled: true,
        },
      },
    });
    expect(edges[1]).toMatchObject({
      id: "fallback-edge",
      type: "straight",
      className:
        "registry-graph-flow__edge registry-graph-flow__edge--fallback",
      data: {
        edgeFamily: "fallback",
        semantic: {
          edgeFamily: "fallback",
          edgeKind: "control-flow",
        },
      },
    });
  });

  test("uses the fallback node family for legacy nodes and preserves graph-local summary metadata", () => {
    const graph = {
      id: "graph.fallback-node-fixture",
      slug: "fallback-node-fixture",
      kind: "graph",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: [],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-19T00:00:00.000Z",
      updatedAt: "2026-06-19T00:00:00.000Z",
      subjectId: "module.grouped-query-attention",
      graphType: "module-compute-flow",
      rootNodeId: "fallback-node",
      layout: "vertical-expandable",
      defaultExpandedDepth: 1,
      supportedRenderers: ["react-flow"],
      nodes: [
        {
          id: "fallback-node",
          labelKey: "graph.nodes.fallbackNode.label",
          summaryKey: "graph.nodes.fallbackNode.summary",
          moduleKind: "other",
          childNodeIds: [],
          visualRole: "timeline-node",
        },
      ],
      edges: [],
    } satisfies GraphRecord;

    const graphMessages = {
      title: "Fixture",
      description: "Fixture",
      graph: {
        nodes: {
          fallbackNode: {
            label: "Legacy timeline node",
            summary: "Graph-local explanation for an older visual role.",
          },
        },
      },
    } satisfies PageMessages;

    const { nodes } = buildRegistryFlowGraph(graph, graphMessages);
    const fallbackNode = nodes[0];
    expect(fallbackNode).toBeDefined();
    expect(nodes[0]?.data.nodeFamily).toBe("fallback");
    expect(nodes[0]?.type).toBe("fallback");
    expect(nodes[0]?.data.semantic.resolvedSummary).toBe(
      "Graph-local explanation for an older visual role.",
    );

    const html = renderToStaticMarkup(
      <ReactFlowProvider>
        {FallbackNode({
          id: "fallback-node",
          data: fallbackNode?.data as RegistryFlowNodeData,
          type: "fallback",
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: false,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
          xPos: 0,
          yPos: 0,
          draggingHandle: null,
          targetPosition: undefined,
          sourcePosition: undefined,
          width: fallbackNode?.style?.width as number | undefined,
          height: fallbackNode?.style?.height as number | undefined,
          parentId: undefined,
          dragHandle: undefined,
        } as never)}
      </ReactFlowProvider>,
    );

    expect(html).toContain('data-graph-node-family="fallback"');
    expect(html).toContain('data-graph-node-type="fallback"');
    expect(html).toContain('data-graph-summary-affordance="true"');
    expect(html).toContain("Summary available");
    expect(html).toContain("Legacy timeline node");
  });
});
