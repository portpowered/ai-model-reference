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
} satisfies PageMessages;

describe("graph-flow", () => {
  test("resolves GQA compute-flow graph by graphId with message-backed node labels", () => {
    const graph = getGraphById("graph.grouped-query-attention-compute-flow");
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const label = resolveGraphNodeLabel(
      gqaMessages,
      graph.nodes[0]?.labelKey ?? "",
    );
    expect(label).toBe("Grouped-query attention compute flow");

    const { nodes, edges } = buildRegistryFlowGraph(graph, gqaMessages);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0]?.data.label).toBe("Grouped-query attention compute flow");
    expect(edges).toEqual([]);
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
