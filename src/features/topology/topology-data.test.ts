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
        "classification.module.activation",
        "classification.module.attention",
        "classification.module.feed-forward",
        "classification.module.normalization",
        "classification.module.positional-encoding",
        "classification.module.tokenization",
        "classification.module.transformer-block",
      ]),
    );

    expect(graph.nodes.map((node) => node.registryId)).toEqual(
      expect.arrayContaining([
        "classification.module.activation",
        "classification.module.feed-forward",
        "classification.module",
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
      primaryClassificationId: "classification.module.activation",
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
          sourceId: "classification.module.activation",
          targetId: "module.relu",
          membershipType: "primary",
        }),
        expect.objectContaining({
          kind: "membership",
          sourceId: "classification.module.feed-forward",
          targetId: "module.feed-forward-network",
          membershipType: "primary",
        }),
        expect.objectContaining({
          kind: "relationship",
          sourceId: "module.feed-forward-network",
          targetId: "concept.activation",
          relationshipType: "uses",
        }),
        expect.objectContaining({
          kind: "membership",
          sourceId: "classification.module.activation",
          targetId: "module.gelu",
          membershipType: "primary",
        }),
        expect.objectContaining({
          kind: "relationship",
          sourceId: "module.feed-forward-network",
          targetId: "classification.module",
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
    expect(buildTopologyGraph(["concept"])).toMatchObject({
      status: "empty",
      reason: "no-members",
      selectedClassifications: [
        expect.objectContaining({
          classificationId: "classification.concept",
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
