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

  test("loads a bundled graph record by id", () => {
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

  test("lists generated bundled graph records", () => {
    const records = listGraphRecords();
    const ids = records.map((record) => record.id);

    expect(ids).toContain(CANONICAL_GRAPH_ID);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("graph.inference-engine-system-flow");
    expect(
      records.find((record) => record.id === CANONICAL_GRAPH_ID)?.subjectId,
    ).toBe("model.gpt-3");
  });

  test("uses registered records for lookup without adding override-only records to the bundled listing", () => {
    const rootRecord = requireBundledGraph();
    const overrideOnlyRecord = graphRecordSchema.parse({
      ...rootRecord,
      id: "graph.runtime-override-only",
      slug: "runtime-override-only",
      subjectId: "concept.runtime-override-only",
    });

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
