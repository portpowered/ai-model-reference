import { describe, expect, test } from "bun:test";
import {
  getGraphById,
  listGraphRecords,
} from "@/lib/content/graph-registry-runtime";

describe("graph-registry-runtime", () => {
  test("loads published graph records by id", () => {
    expect(getGraphById("graph.grouped-query-attention-compute-flow")?.id).toBe(
      "graph.grouped-query-attention-compute-flow",
    );
    expect(
      getGraphById("graph.grouped-query-attention-compute-schema")?.id,
    ).toBe("graph.grouped-query-attention-compute-schema");
    expect(getGraphById("graph.token-concept-map")?.id).toBe(
      "graph.token-concept-map",
    );
  });

  test("lists all bundled graph records", () => {
    expect(listGraphRecords().length).toBe(3);
  });
});
