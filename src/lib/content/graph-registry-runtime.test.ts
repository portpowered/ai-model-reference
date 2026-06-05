import { describe, expect, test } from "bun:test";
import {
  getGraphById,
  listGraphRecords,
} from "@/lib/content/graph-registry-runtime";

describe("graph-registry-runtime", () => {
  test("loads published graph records by id", () => {
    const computeFlow = getGraphById(
      "graph.grouped-query-attention-compute-flow",
    );
    expect(computeFlow?.id).toBe("graph.grouped-query-attention-compute-flow");
    expect(computeFlow?.nodes.length).toBeGreaterThanOrEqual(4);
    expect(computeFlow?.edges.length).toBeGreaterThanOrEqual(3);

    const computeSchema = getGraphById(
      "graph.grouped-query-attention-compute-schema",
    );
    expect(computeSchema?.id).toBe(
      "graph.grouped-query-attention-compute-schema",
    );
    expect(computeSchema?.nodes.length).toBeGreaterThanOrEqual(4);
    expect(computeSchema?.edges.length).toBeGreaterThanOrEqual(3);

    expect(getGraphById("graph.token-concept-map")?.id).toBe(
      "graph.token-concept-map",
    );
  });

  test("lists all bundled graph records", () => {
    expect(listGraphRecords().length).toBe(3);
  });
});
