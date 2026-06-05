import { describe, expect, test } from "bun:test";
import {
  buildRegistryFlowGraph,
  orderGraphNodes,
  resolveGraphNodeLabel,
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
});
