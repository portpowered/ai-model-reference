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

  test("resolves canonical classification ids and canonical slugs without selector shims", () => {
    const canonicalIdGraph = buildTopologyGraph([
      "classification.module.activation",
    ]);
    const canonicalSlugGraph = buildTopologyGraph(["activation-functions"]);

    expectSuccessGraph(canonicalIdGraph);
    expectSuccessGraph(canonicalSlugGraph);

    expect(canonicalIdGraph.selectedClassifications).toEqual([
      expect.objectContaining({
        selector: "classification.module.activation",
        classificationId: "classification.module.activation",
      }),
    ]);
    expect(canonicalSlugGraph.selectedClassifications).toEqual([
      expect.objectContaining({
        selector: "activation-functions",
        classificationId: "classification.module.activation",
      }),
    ]);
    expect(canonicalIdGraph.nodes.map((node) => node.registryId)).toEqual(
      canonicalSlugGraph.nodes.map((node) => node.registryId),
    );
    expect(canonicalIdGraph.edges.map((edge) => edge.id)).toEqual(
      canonicalSlugGraph.edges.map((edge) => edge.id),
    );
  });

  test("keeps shorthand selectors on an explicit temporary compatibility path", () => {
    const graph = buildTopologyGraph(["activation", "feed-forward-network"]);
    expectSuccessGraph(graph);

    expect(
      graph.selectedClassifications.map((selection) => ({
        selector: selection.selector,
        classificationId: selection.classificationId,
      })),
    ).toEqual([
      {
        selector: "activation",
        classificationId: "classification.module.activation",
      },
      {
        selector: "feed-forward-network",
        classificationId: "classification.module.feed-forward",
      },
    ]);
  });

  test("keeps legacy classification ids on an explicit temporary compatibility path", () => {
    const graph = buildTopologyGraph([
      "classification.activation-functions",
      "classification.feed-forward-networks",
    ]);
    expectSuccessGraph(graph);

    expect(
      graph.selectedClassifications.map((selection) => ({
        selector: selection.selector,
        classificationId: selection.classificationId,
      })),
    ).toEqual([
      {
        selector: "classification.activation-functions",
        classificationId: "classification.module.activation",
      },
      {
        selector: "classification.feed-forward-networks",
        classificationId: "classification.module.feed-forward",
      },
    ]);
  });

  test("does not accept unrelated shorthand selectors outside the explicit compatibility set", () => {
    expect(buildTopologyGraph(["attention"])).toEqual({
      status: "error",
      invalidSelections: ["attention"],
      recoverySelection: getDefaultTopologyClassificationSelectors(),
      selectedClassifications: [],
      nodes: [],
      edges: [],
    });
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
