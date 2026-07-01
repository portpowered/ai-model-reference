import { describe, expect, test } from "bun:test";
import qwen36MoeMessages from "@/content/docs/models/qwen-3-6-35b-a3b/messages/en.json";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";

const MOE_MODEL_ID = "model.qwen-3-6-35b-a3b";
const MOE_GRAPH_ID = "graph.qwen-3-6-35b-a3b-architecture";

describe("Qwen3.6-35B-A3B MoE model page", () => {
  test("publishes the MoE model page at the verified route with matching registry record", () => {
    const model = getModelById(MOE_MODEL_ID);
    const entry = getPublishedDocsEntryByRegistryId(MOE_MODEL_ID);

    expect(model).toMatchObject({
      id: MOE_MODEL_ID,
      slug: "qwen-3-6-35b-a3b",
      status: "published",
      parameterCount: "35 billion total parameters",
      activeParameterCount: "3 billion active parameters",
      contextLength: 262144,
      modalities: ["text", "image", "video"],
      sourceType: "open-weights",
    });
    expect(entry).toMatchObject({
      registryId: MOE_MODEL_ID,
      slug: "qwen-3-6-35b-a3b",
      url: "/docs/models/qwen-3-6-35b-a3b",
    });
  });

  test("resolves the page-local architecture graph with sparse expert routing emphasis", () => {
    const graph = getGraphById(MOE_GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const moeRoutingNode = graph.nodes.find(
      (node) => node.id === "moe-routing",
    );
    expect(moeRoutingNode?.registryId).toBe("module.mixture-of-experts");
    expect(
      resolveGraphNodeLabel(qwen36MoeMessages, moeRoutingNode?.labelKey ?? ""),
    ).toBe("Expert\nRouting");

    const { nodes } = buildRegistryFlowGraph(graph, qwen36MoeMessages);
    expect(nodes.map((node) => node.data.label)).toContain("Expert\nRouting");
    expect(nodes.map((node) => node.data.label)).not.toContain(
      "Dense\nFeed\nForward",
    );
  });
});
