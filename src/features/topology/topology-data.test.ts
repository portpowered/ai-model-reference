import { describe, expect, test } from "bun:test";
import {
  buildTopologyGraph,
  getDefaultTopologyClassificationSelectors,
} from "./topology-data";

function expectSuccessGraph(
  graph: ReturnType<typeof buildTopologyGraph>,
): asserts graph is Extract<
  ReturnType<typeof buildTopologyGraph>,
  { status: "success" }
> {
  expect(graph.status).toBe("success");
  if (graph.status !== "success") {
    throw new Error(`Expected success graph, received ${graph.status}`);
  }
}

describe("topology data builder", () => {
  test("derives the default topology graph from published ontology classifications", () => {
    const graph = buildTopologyGraph(
      getDefaultTopologyClassificationSelectors(),
    );
    expectSuccessGraph(graph);

    expect(
      graph.selectedClassifications.map(
        (selection) => selection.classificationId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "classification.activation-functions",
        "classification.feed-forward-networks",
      ]),
    );

    expect(graph.nodes.map((node) => node.registryId)).toEqual(
      expect.arrayContaining([
        "classification.activation-functions",
        "classification.feed-forward-networks",
        "classification.neural-network-components",
        "concept.activation",
        "module.relu",
        "module.leaky-relu",
        "module.silu",
        "module.swiglu",
        "module.standard-ffn",
        "module.feed-forward-network",
      ]),
    );

    expect(
      graph.nodes.find((node) => node.registryId === "module.relu"),
    ).toMatchObject({
      kind: "record",
      recordKind: "module",
      primaryClassificationId: "classification.activation-functions",
      canonicalHref: "/docs/modules/relu",
    });
  });

  test("creates membership and typed relationship edges for the seed slice", () => {
    const graph = buildTopologyGraph(["activation-function", "feed-forward"]);
    expectSuccessGraph(graph);

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "membership",
          sourceId: "classification.activation-functions",
          targetId: "module.relu",
          membershipType: "primary",
        }),
        expect.objectContaining({
          kind: "membership",
          sourceId: "classification.feed-forward-networks",
          targetId: "module.standard-ffn",
          membershipType: "primary",
        }),
        expect.objectContaining({
          kind: "relationship",
          sourceId: "module.standard-ffn",
          targetId: "concept.activation",
          relationshipType: "uses",
        }),
        expect.objectContaining({
          kind: "relationship",
          sourceId: "module.swiglu",
          targetId: "module.silu",
          relationshipType: "uses",
        }),
        expect.objectContaining({
          kind: "relationship",
          sourceId: "module.feed-forward-network",
          targetId: "classification.neural-network-components",
          relationshipType: "part-of",
        }),
      ]),
    );
  });

  test("returns a stable empty result for empty selections", () => {
    expect(buildTopologyGraph([])).toEqual({
      status: "empty",
      reason: "no-selection",
      selectedClassifications: [],
      nodes: [],
      edges: [],
    });
  });

  test("returns a stable empty result for valid classifications without visible members", () => {
    expect(buildTopologyGraph(["neural-network-components"])).toMatchObject({
      status: "empty",
      reason: "no-members",
      selectedClassifications: [
        expect.objectContaining({
          classificationId: "classification.neural-network-components",
        }),
      ],
    });
  });

  test("returns a recoverable error for invalid classification selectors", () => {
    expect(buildTopologyGraph(["activation", "missing-slice"])).toEqual({
      status: "error",
      invalidSelections: ["missing-slice"],
      recoverySelection: getDefaultTopologyClassificationSelectors(),
      selectedClassifications: [],
      nodes: [],
      edges: [],
    });
  });
});
