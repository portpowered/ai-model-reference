import { describe, expect, test } from "bun:test";
import {
  assertSparseAttentionModuleConvergence,
  buildSparseAttentionStubBody,
} from "@/lib/verify/sparse-attention-module-convergence";

describe("assertSparseAttentionModuleConvergence", () => {
  test("passes against the sparse-attention module stub body", () => {
    expect(
      assertSparseAttentionModuleConvergence(buildSparseAttentionStubBody()),
    ).toBeNull();
  });

  test("fails when a required marker is missing", () => {
    const result = assertSparseAttentionModuleConvergence(
      "<div>Sparse Attention</div>",
    );
    expect(result).toContain("missing expected content");
  });
});
