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

    const mhaComparison = getGraphById(
      "graph.grouped-query-attention-mha-comparison",
    );
    expect(mhaComparison?.id).toBe(
      "graph.grouped-query-attention-mha-comparison",
    );
    expect(mhaComparison?.nodes.length).toBe(3);

    const gqaComparison = getGraphById(
      "graph.grouped-query-attention-gqa-comparison",
    );
    expect(gqaComparison?.id).toBe(
      "graph.grouped-query-attention-gqa-comparison",
    );
    expect(gqaComparison?.nodes.length).toBe(3);

    const mlaMhaComparison = getGraphById(
      "graph.multi-head-latent-attention-mha-comparison",
    );
    expect(mlaMhaComparison?.id).toBe(
      "graph.multi-head-latent-attention-mha-comparison",
    );
    expect(mlaMhaComparison?.nodes.length).toBe(3);

    const mlaComparison = getGraphById(
      "graph.multi-head-latent-attention-mla-comparison",
    );
    expect(mlaComparison?.id).toBe(
      "graph.multi-head-latent-attention-mla-comparison",
    );
    expect(mlaComparison?.nodes.length).toBe(3);

    expect(getGraphById("graph.token-concept-map")?.id).toBe(
      "graph.token-concept-map",
    );
  });

  test("lists all bundled graph records", () => {
    expect(listGraphRecords().length).toBe(7);
  });
});
