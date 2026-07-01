import { describe, expect, test } from "bun:test";
import qwen36DenseMessages from "@/content/docs/models/qwen-3-6-27b/messages/en.json";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";

const DENSE_MODEL_ID = "model.qwen-3-6-27b";
const DENSE_GRAPH_ID = "graph.qwen-3-6-27b-architecture";

describe("Qwen3.6-27B dense model page", () => {
  test("publishes the dense model page at the verified route with matching registry record", () => {
    const model = getModelById(DENSE_MODEL_ID);
    const entry = getPublishedDocsEntryByRegistryId(DENSE_MODEL_ID);

    expect(model).toMatchObject({
      id: DENSE_MODEL_ID,
      slug: "qwen-3-6-27b",
      status: "published",
      parameterCount: "27 billion parameters",
      contextLength: 262144,
      modalities: ["text", "image"],
      sourceType: "open-weights",
    });
    expect(entry).toMatchObject({
      registryId: DENSE_MODEL_ID,
      slug: "qwen-3-6-27b",
      url: "/docs/models/qwen-3-6-27b",
    });
  });

  test("resolves the page-local architecture graph with dense feed-forward emphasis", () => {
    const graph = getGraphById(DENSE_GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const denseFfnNode = graph.nodes.find((node) => node.id === "dense-ffn");
    expect(denseFfnNode?.registryId).toBe("module.standard-ffn");
    expect(
      resolveGraphNodeLabel(qwen36DenseMessages, denseFfnNode?.labelKey ?? ""),
    ).toBe("Dense\nFeed\nForward");

    const { nodes } = buildRegistryFlowGraph(graph, qwen36DenseMessages);
    expect(nodes.map((node) => node.data.label)).toContain(
      "Dense\nFeed\nForward",
    );
    expect(nodes.map((node) => node.data.label)).not.toContain("DeepSeekMoE");
  });
});
