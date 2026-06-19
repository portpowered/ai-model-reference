import { describe, expect, test } from "bun:test";
import gpt3Messages from "@/content/docs/models/gpt-3/messages/en.json";
import mixtureOfExpertsMessages from "@/content/docs/modules/mixture-of-experts/messages/en.json";
import {
  buildRegistryFlowGraph,
  estimateRegistryFlowNodeBoxSize,
  orderGraphNodes,
  resolveGraphNodeLabel,
  resolveRegistryFlowEdgeFamily,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import type { PageMessages } from "@/lib/content/schemas";

const gqaMessages = {
  title: "Grouped-Query Attention",
  description: "GQA module",
  assets: {
    computeFlow: {
      alt: "Grouped-query attention compute flow",
      caption: "Query groups route to shared KV heads during attention",
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
      valuesLabel: { label: "Values" },
      keysLabel: { label: "Keys" },
      queriesLabel: { label: "Queries" },
      queryHead: { label: "q" },
      keyHead: { label: "k" },
      valueHead: { label: "V" },
      mhaQueryHeads: { label: "H query heads" },
      mhaKvHeads: { label: "H KV head pairs" },
      mhaQueryHead1: { label: "Q1" },
      mhaQueryHead2: { label: "Q2" },
      mhaQueryHead3: { label: "Q3" },
      mhaQueryHead4: { label: "Q4" },
      mhaQueryHead5: { label: "Q5" },
      mhaKvPair1: { label: "K1 / V1" },
      mhaKvPair2: { label: "K2 / V2" },
      mhaKvPair3: { label: "K3 / V3" },
      mhaKvPair4: { label: "K4 / V4" },
      mhaKvPair5: { label: "K5 / V5" },
    },
  },
} satisfies PageMessages;

describe("graph-flow", () => {
  test("resolves GQA compute-flow graph with multiple message-backed nodes and edges", () => {
    const graph = getGraphById("graph.grouped-query-attention-compute-flow");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.nodes.length).toBeGreaterThanOrEqual(4);
    expect(graph.edges.length).toBeGreaterThanOrEqual(3);

    const label = resolveGraphNodeLabel(
      gqaMessages,
      graph.nodes[0]?.labelKey ?? "",
    );
    expect(label).toBe("Hidden states");

    const { nodes, edges } = buildRegistryFlowGraph(graph, gqaMessages);
    expect(nodes.length).toBe(6);
    expect(edges.length).toBe(5);
    expect(nodes.map((node) => node.data.label)).toContain("G query groups");
    expect(nodes.map((node) => node.data.label)).toContain(
      "Shared KV heads per group",
    );
    expect(nodes[0]?.data.semantic.resolvedTitle).toBe("Hidden states");
    expect(nodes[0]?.data.semantic.hasCanonicalPage).toBe(false);
    expect(edges[0]?.data?.semantic).toMatchObject({
      edgeFamily: "data-flow",
      edgeKind: "data-flow",
      sourceNodeId: "hidden-states",
      targetNodeId: "query-projection",
      sourceTitle: "Hidden states",
      targetTitle: "H query heads (Q projection)",
      interactionEnabled: false,
    });
  });

  test("resolves GQA compute-schema graph with shared KV and cache nodes", () => {
    const graph = getGraphById("graph.grouped-query-attention-compute-schema");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.nodes.length).toBeGreaterThanOrEqual(4);
    expect(graph.edges.length).toBeGreaterThanOrEqual(3);

    const { nodes, edges } = buildRegistryFlowGraph(graph, gqaMessages);
    expect(nodes.length).toBe(5);
    expect(edges.length).toBe(5);
    expect(nodes.map((node) => node.data.label)).toContain(
      "G shared key heads",
    );
    expect(nodes.map((node) => node.data.label)).toContain(
      "KV cache (G keys + G values per token)",
    );
  });

  test("orders token concept-map nodes from root through child links", () => {
    const graph = getGraphById("graph.token-concept-map");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const ordered = orderGraphNodes(graph);
    expect(ordered.map((node) => node.id)).toEqual([
      "raw-text",
      "tokenizer",
      "token-ids",
      "embeddings",
    ]);
  });

  test("preserves explicit row positions for GQA MHA head multiplicity graph", () => {
    const graph = getGraphById("graph.grouped-query-attention-mha-comparison");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes, edges } = buildRegistryFlowGraph(graph, gqaMessages);
    expect(nodes.length).toBe(15);
    expect(edges.length).toBe(8);
    expect(
      nodes.find((node) => node.id === "mha-query-heads")?.position,
    ).toEqual({ x: -112, y: 334 });
    expect(
      nodes.find((node) => node.id === "mha-keys-label")?.position,
    ).toEqual({
      x: -112,
      y: 184,
    });
    expect(
      nodes.find((node) => node.id === "mha-query-head-4")?.position,
    ).toEqual({ x: 660, y: 300 });
    expect(nodes.map((node) => node.data.label)).toContain("q");
    expect(nodes.map((node) => node.data.label)).toContain("k");
    expect(nodes.map((node) => node.data.label)).toContain("V");
  });

  test("prefers graph subject messages before host page messages for reusable graphs", () => {
    const graph = getGraphById("graph.multi-head-attention-mha-comparison");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const hostMessages = {
      ...gqaMessages,
      graph: {
        nodes: {
          valuesLabel: { label: "Host values" },
        },
      },
    } satisfies PageMessages;

    const subjectMessages = {
      ...gqaMessages,
      graph: {
        nodes: {
          valuesLabel: { label: "Subject values" },
          keysLabel: { label: "Subject keys" },
          queriesLabel: { label: "Subject queries" },
          queryHead: { label: "q" },
          keyHead: { label: "k" },
          valueHead: { label: "V" },
        },
      },
    } satisfies PageMessages;

    const { nodes } = buildRegistryFlowGraph(
      graph,
      hostMessages,
      subjectMessages,
    );
    expect(
      nodes.find((node) => node.id === "mha-values-label")?.data.label,
    ).toBe("Subject values");
    expect(nodes.find((node) => node.id === "mha-keys-label")?.data.label).toBe(
      "Subject keys",
    );
  });

  test("preserves canonical node semantics and resolved summaries for GPT-3 architecture nodes", () => {
    const graph = getGraphById("graph.gpt-3-architecture");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes, edges } = buildRegistryFlowGraph(
      graph,
      gpt3Messages as PageMessages,
    );
    const maskedMhaNode = nodes.find((node) => node.id === "masked-mha");
    const decoderStackNode = nodes.find((node) => node.id === "decoder-stack");
    const addNormEdge = edges.find(
      (edge) => edge.id === "masked-mha-to-add-norm-attention",
    );

    expect(maskedMhaNode?.data.semantic).toMatchObject({
      registryId: "module.multi-head-attention",
      entityKind: "module",
      resolvedTitle: "Masked\nMulti-Head\nAttention",
      resolvedSummary: "Each token can read earlier tokens but not future ones",
      hasCanonicalPage: true,
      canonicalPageHref: "/docs/modules/multi-head-attention",
    });
    expect(decoderStackNode?.data.semantic).toMatchObject({
      registryId: "concept.transformer-architecture",
      resolvedTitle: "Transformer architecture",
    });
    expect(addNormEdge?.data?.semantic).toMatchObject({
      edgeFamily: "data-flow",
      edgeKind: "data-flow",
      sourceNodeId: "masked-mha",
      targetNodeId: "add-norm-attention",
      sourceRegistryId: "module.multi-head-attention",
      targetRegistryId: "module.layer-norm",
      sourceTitle: "Masked\nMulti-Head\nAttention",
      targetTitle: "Add & Norm",
      interactionEnabled: false,
    });
  });

  test("falls back to canonical registry summaries when a graph node does not supply one", () => {
    const graph = {
      id: "graph.registry-summary-fixture",
      slug: "registry-summary-fixture",
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
      rootNodeId: "layer-norm-node",
      layout: "vertical-expandable",
      defaultExpandedDepth: 1,
      supportedRenderers: ["react-flow"],
      nodes: [
        {
          id: "layer-norm-node",
          labelKey: "graph.nodes.layerNormNode.label",
          registryId: "module.layer-norm",
          moduleKind: "normalization",
          childNodeIds: [],
        },
      ],
      edges: [],
    } satisfies Parameters<typeof buildRegistryFlowGraph>[0];

    const pageMessages = {
      title: "Fixture",
      description: "Fixture",
      graph: {
        nodes: {
          layerNormNode: {
            label: "Layer Norm",
          },
        },
      },
    } satisfies PageMessages;

    const { nodes } = buildRegistryFlowGraph(graph, pageMessages);
    expect(nodes[0]?.data.semantic.resolvedSummary).toBe(
      "Per-token mean-and-variance normalization that rescales each hidden vector before the next sublayer in a transformer block.",
    );
  });

  test("marks canonical nodes without published docs pages as non-linkable", () => {
    const graph = {
      id: "graph.unpublished-canonical-fixture",
      slug: "unpublished-canonical-fixture",
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
      rootNodeId: "batch-norm-node",
      layout: "vertical-expandable",
      defaultExpandedDepth: 1,
      supportedRenderers: ["react-flow"],
      nodes: [
        {
          id: "dataset-node",
          labelKey: "graph.nodes.datasetNode.label",
          summaryKey: "graph.nodes.datasetNode.summary",
          registryId: "dataset.deepseek-v4-specialist-corpus",
          moduleKind: "dataset",
          childNodeIds: [],
        },
      ],
      edges: [],
    } satisfies Parameters<typeof buildRegistryFlowGraph>[0];

    const pageMessages = {
      title: "Fixture",
      description: "Fixture",
      graph: {
        nodes: {
          datasetNode: {
            label: "DeepSeek V4 specialist corpus",
            summary: "Dataset node without a published canonical docs page.",
          },
        },
      },
    } satisfies PageMessages;

    const { nodes } = buildRegistryFlowGraph(graph, pageMessages);
    expect(nodes[0]?.data.semantic).toMatchObject({
      registryId: "dataset.deepseek-v4-specialist-corpus",
      entityKind: "dataset",
      hasCanonicalPage: false,
      resolvedSummary: "Dataset node without a published canonical docs page.",
    });
    expect(nodes[0]?.data.semantic.canonicalPageHref).toBeUndefined();
  });

  test("preserves the requested MoE annotation height when the content already fits", () => {
    const graph = getGraphById("graph.mixture-of-experts-routing-flow");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes } = buildRegistryFlowGraph(
      graph,
      mixtureOfExpertsMessages as PageMessages,
    );
    const inactiveExpertsNode = nodes.find(
      (node) => node.id === "inactive-experts",
    );
    const expertEllipsisNode = nodes.find(
      (node) => node.id === "expert-ellipsis",
    );
    const sourceNode = graph.nodes.find(
      (node) => node.id === "inactive-experts",
    );

    expect(sourceNode?.size?.height).toBe(120);
    expect(inactiveExpertsNode?.data.label).toBe(
      "Most of the expert pool stays inactive for this token",
    );
    expect(expertEllipsisNode?.data.label).toBe("...");
    expect(inactiveExpertsNode?.style).toBeDefined();
    expect(inactiveExpertsNode?.data.size?.height).toBe(
      sourceNode?.size?.height,
    );
    expect(inactiveExpertsNode?.style).toMatchObject({
      width: inactiveExpertsNode?.data.size?.width,
      height: inactiveExpertsNode?.data.size?.height,
    });
  });

  test("classifies explicit edge families and preserves fallback behavior for older supported edge kinds", () => {
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
    expect(resolveRegistryFlowEdgeFamily("conditioning")).toBe("fallback");
    expect(resolveRegistryFlowEdgeFamily("loss-signal")).toBe("fallback");
  });

  test("keeps the requested annotation box when the MoE inactive-experts label fits", () => {
    const estimated = estimateRegistryFlowNodeBoxSize({
      label: "Most of the expert pool stays inactive for this token",
      visualRole: "annotation",
      requestedSize: { width: 230, height: 120 },
    });

    expect(estimated).toEqual({ width: 230, height: 120 });
  });
});
