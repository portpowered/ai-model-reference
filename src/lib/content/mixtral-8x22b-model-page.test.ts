import { describe, expect, test } from "bun:test";
import mixtral8x22bMessages from "@/content/docs/models/mixtral-8x22b/messages/en.json";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";

const MOE_MODEL_ID = "model.mixtral-8x22b";
const MOE_GRAPH_ID = "graph.mixtral-8x22b-architecture";

describe("Mixtral 8x22B MoE model page", () => {
  test("publishes the MoE model page at the verified route with matching registry record", () => {
    const model = getModelById(MOE_MODEL_ID);
    const entry = getPublishedDocsEntryByRegistryId(MOE_MODEL_ID);

    expect(model).toMatchObject({
      id: MOE_MODEL_ID,
      slug: "mixtral-8x22b",
      status: "published",
      parameterCount: "141 billion total parameters",
      activeParameterCount: "39 billion active parameters",
      contextLength: 65536,
      modalities: ["text"],
      sourceType: "open-weights",
      releaseDate: "2024-04-17",
    });
    expect(entry).toMatchObject({
      registryId: MOE_MODEL_ID,
      slug: "mixtral-8x22b",
      url: "/docs/models/mixtral-8x22b",
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
      resolveGraphNodeLabel(
        mixtral8x22bMessages,
        moeRoutingNode?.labelKey ?? "",
      ),
    ).toBe("Expert\nRouter");

    const { nodes } = buildRegistryFlowGraph(graph, mixtral8x22bMessages);
    expect(nodes.map((node) => node.data.label)).toContain("Expert\nRouter");
    expect(nodes.map((node) => node.data.label)).not.toContain(
      "Dense\nFeed\nForward",
    );
  });
});
