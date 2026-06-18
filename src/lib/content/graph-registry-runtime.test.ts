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
    expect(mhaComparison?.nodes.length).toBe(15);
    expect(mhaComparison?.nodes.map((node) => node.id)).toContain(
      "mha-query-head-4",
    );
    expect(mhaComparison?.nodes.map((node) => node.id)).toContain(
      "mha-value-head-4",
    );

    const gqaComparison = getGraphById(
      "graph.grouped-query-attention-gqa-comparison",
    );
    expect(gqaComparison?.id).toBe(
      "graph.grouped-query-attention-gqa-comparison",
    );
    expect(gqaComparison?.nodes.length).toBe(11);

    const mhaPageComparison = getGraphById(
      "graph.multi-head-attention-mha-comparison",
    );
    expect(mhaPageComparison?.id).toBe(
      "graph.multi-head-attention-mha-comparison",
    );
    expect(mhaPageComparison?.subjectId).toBe("module.multi-head-attention");
    expect(mhaPageComparison?.nodes.length).toBe(15);

    const mqaPageComparison = getGraphById(
      "graph.multi-head-attention-mqa-comparison",
    );
    expect(mqaPageComparison?.id).toBe(
      "graph.multi-head-attention-mqa-comparison",
    );
    expect(mqaPageComparison?.nodes.length).toBe(3);

    const mhaTimePattern = getGraphById(
      "graph.multi-head-attention-time-pattern",
    );
    expect(mhaTimePattern?.id).toBe("graph.multi-head-attention-time-pattern");
    expect(mhaTimePattern?.nodes.length).toBe(7);

    const mqaModuleMhaComparison = getGraphById(
      "graph.multi-query-attention-mha-comparison",
    );
    expect(mqaModuleMhaComparison?.id).toBe(
      "graph.multi-query-attention-mha-comparison",
    );
    expect(mqaModuleMhaComparison?.subjectId).toBe(
      "module.multi-query-attention",
    );

    const mqaModuleMqaComparison = getGraphById(
      "graph.multi-query-attention-mqa-comparison",
    );
    expect(mqaModuleMqaComparison?.id).toBe(
      "graph.multi-query-attention-mqa-comparison",
    );
    expect(mqaModuleMqaComparison?.nodes.length).toBe(9);

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
    expect(mlaComparison?.nodes.length).toBe(15);

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
    expect(linearComparison?.nodes.length).toBe(11);

    const slidingWindowTimePattern = getGraphById(
      "graph.sliding-window-attention-time-window-pattern",
    );
    expect(slidingWindowTimePattern?.id).toBe(
      "graph.sliding-window-attention-time-window-pattern",
    );
    expect(slidingWindowTimePattern?.nodes.length).toBe(7);

    const sparseTimePattern = getGraphById(
      "graph.sparse-attention-time-pattern",
    );
    expect(sparseTimePattern?.id).toBe("graph.sparse-attention-time-pattern");
    expect(sparseTimePattern?.nodes.length).toBe(7);

    const bidirectionalTimePattern = getGraphById(
      "graph.bidirectional-attention-time-pattern",
    );
    expect(bidirectionalTimePattern?.id).toBe(
      "graph.bidirectional-attention-time-pattern",
    );
    expect(bidirectionalTimePattern?.subjectId).toBe(
      "module.bidirectional-attention",
    );
    expect(bidirectionalTimePattern?.nodes.length).toBe(8);

    expect(getGraphById("graph.token-concept-map")?.id).toBe(
      "graph.token-concept-map",
    );
  });

  test("lists all bundled graph records", () => {
    const records = listGraphRecords();

    expect(records.length).toBe(49);
    expect(records.map((record) => record.id)).toContain(
      "graph.deepseek-v4-contribution",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.bidirectional-attention-time-pattern",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.deepseek-v4-flash-architecture",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.deepseek-v4-pro-architecture",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.expert-parallel-overlap-system-flow",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.glm-5-architecture",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.glm-5-contribution",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.agentic-engineering-concept-map",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.asynchronous-agent-reinforcement-learning-training-flow",
    );
    expect(records.map((record) => record.id)).toContain(
      "graph.slime-rollout-framework-system-flow",
    );
  });
});
