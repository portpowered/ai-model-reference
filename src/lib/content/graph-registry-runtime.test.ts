import { afterEach, describe, expect, test } from "bun:test";
import {
  clearRegisteredGraphRecords,
  getGraphById,
  listGraphRecords,
  registerGraphRecords,
} from "@/lib/content/graph-registry-runtime";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

const CANONICAL_GRAPH_ID = "graph.gpt-3-architecture";

function requireBundledGraph(id = CANONICAL_GRAPH_ID): GraphRecord {
  const record = getGraphById(id);
  expect(record).toBeDefined();
  return graphRecordSchema.parse(record);
}

describe("graph-registry-runtime", () => {
  afterEach(() => {
    clearRegisteredGraphRecords();
  });

  test("loads representative published graph records by id", () => {
    const deploymentSystemFlow = getGraphById("graph.deployment-system-flow");
    expect(deploymentSystemFlow?.id).toBe("graph.deployment-system-flow");
    expect(deploymentSystemFlow?.subjectId).toBe("system.deployment");
    expect(deploymentSystemFlow?.nodes.map((node) => node.id)).toEqual([
      "package",
      "fit",
      "rollout",
      "rollback",
    ]);
    const computeFlow = getGraphById(
      "graph.grouped-query-attention-compute-flow",
    );
    expect(computeFlow?.id).toBe("graph.grouped-query-attention-compute-flow");
    expect(computeFlow?.nodes.length).toBeGreaterThanOrEqual(4);
    expect(computeFlow?.edges.length).toBeGreaterThanOrEqual(3);

    const graph = requireBundledGraph();
    expect(graph.id).toBe(CANONICAL_GRAPH_ID);
    expect(graph.subjectId).toBe("model.gpt-3");
    expect(graph.supportedRenderers).toContain("react-flow");
    expect(graph.nodes.map((node) => node.id)).toContain("masked-mha");
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  test("returns undefined for a missing graph id without disturbing bundled lookups", () => {
    expect(getGraphById("graph.this-does-not-exist")).toBeUndefined();
    expect(getGraphById(CANONICAL_GRAPH_ID)?.id).toBe(CANONICAL_GRAPH_ID);
  });

  test("lists bundled graph records without surfacing override-only registrations", () => {
    const rootRecord = requireBundledGraph();
    const overrideOnlyRecord = graphRecordSchema.parse({
      ...rootRecord,
      id: "graph.runtime-override-only",
      slug: "runtime-override-only",
      subjectId: "concept.runtime-override-only",
    });

    const bundledIds = listGraphRecords().map((record) => record.id);
    expect(new Set(bundledIds).size).toBe(bundledIds.length);
    expect(bundledIds).toContain(CANONICAL_GRAPH_ID);
    expect(bundledIds).toContain("graph.batching-system-flow");
    expect(bundledIds).toContain("graph.pretraining-training-flow");
    expect(bundledIds).toContain("graph.deployment-system-flow");
    expect(bundledIds).toContain("graph.gpt-2-report-contribution");
    expect(bundledIds).toContain("graph.cross-attention-memory-pattern");
    expect(bundledIds).toContain("graph.unigram-tokenizer-segmentation-flow");
    expect(bundledIds).toContain("graph.tokenizer-mismatch-compute-flow");

    registerGraphRecords([overrideOnlyRecord]);

    expect(getGraphById("graph.runtime-override-only")?.subjectId).toBe(
      "concept.runtime-override-only",
    );
    expect(listGraphRecords().map((record) => record.id)).not.toContain(
      "graph.runtime-override-only",
    );

    clearRegisteredGraphRecords();

    expect(getGraphById("graph.runtime-override-only")).toBeUndefined();
  });

  test("lets registered records override bundled lookup and reset to canonical records", () => {
    const rootRecord = requireBundledGraph();
    const proofTemplateNode = rootRecord.nodes[0];
    const overrideRecord = graphRecordSchema.parse({
      ...rootRecord,
      nodes: [
        ...rootRecord.nodes,
        {
          ...proofTemplateNode,
          id: "override-proof-node",
          labelKey: "graph.nodes.overrideProof.label",
        },
      ],
    });

    registerGraphRecords([overrideRecord]);

    const overriddenRecord = getGraphById(CANONICAL_GRAPH_ID);
    expect(overriddenRecord?.nodes.map((node) => node.id)).toContain(
      "override-proof-node",
    );
    expect(
      listGraphRecords()
        .find((record) => record.id === CANONICAL_GRAPH_ID)
        ?.nodes.map((node) => node.id),
    ).not.toContain("override-proof-node");

    clearRegisteredGraphRecords();

    expect(
      getGraphById(CANONICAL_GRAPH_ID)?.nodes.map((node) => node.id),
    ).not.toContain("override-proof-node");
  });
});
