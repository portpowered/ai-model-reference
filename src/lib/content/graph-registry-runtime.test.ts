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

    const mhaPageComparison = getGraphById(
      "graph.multi-head-attention-mha-comparison",
    );
    expect(mhaPageComparison?.id).toBe(
      "graph.multi-head-attention-mha-comparison",
    );
    expect(mhaPageComparison?.subjectId).toBe("module.multi-head-attention");

    const mqaPageComparison = getGraphById(
      "graph.multi-head-attention-mqa-comparison",
    );
    expect(mqaPageComparison?.id).toBe(
      "graph.multi-head-attention-mqa-comparison",
    );
    expect(mqaPageComparison?.nodes.length).toBe(3);

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

    const linearMhaComparison = getGraphById(
      "graph.linear-attention-mha-comparison",
    );
    expect(linearMhaComparison?.id).toBe(
      "graph.linear-attention-mha-comparison",
    );
    expect(linearMhaComparison?.nodes.length).toBe(3);

    const linearComparison = getGraphById(
      "graph.linear-attention-linear-comparison",
    );
    expect(linearComparison?.id).toBe(
      "graph.linear-attention-linear-comparison",
    );
    expect(linearComparison?.nodes.length).toBe(3);

    const slidingWindowMhaComparison = getGraphById(
      "graph.sliding-window-attention-mha-comparison",
    );
    expect(slidingWindowMhaComparison?.id).toBe(
      "graph.sliding-window-attention-mha-comparison",
    );
    expect(slidingWindowMhaComparison?.nodes.length).toBe(3);

    const slidingWindowComparison = getGraphById(
      "graph.sliding-window-attention-window-comparison",
    );
    expect(slidingWindowComparison?.id).toBe(
      "graph.sliding-window-attention-window-comparison",
    );
    expect(slidingWindowComparison?.nodes.length).toBe(3);

    const sparseMhaComparison = getGraphById(
      "graph.sparse-attention-mha-comparison",
    );
    expect(sparseMhaComparison?.id).toBe(
      "graph.sparse-attention-mha-comparison",
    );
    expect(sparseMhaComparison?.nodes.length).toBe(3);

    const sparseComparison = getGraphById(
      "graph.sparse-attention-sparse-comparison",
    );
    expect(sparseComparison?.id).toBe(
      "graph.sparse-attention-sparse-comparison",
    );
    expect(sparseComparison?.nodes.length).toBe(3);

    expect(getGraphById("graph.token-concept-map")?.id).toBe(
      "graph.token-concept-map",
    );
  });

  test("lists all bundled graph records", () => {
    expect(listGraphRecords().length).toBe(15);
  });
});
