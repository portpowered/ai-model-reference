import { describe, expect, test } from "bun:test";
import {
  assertLinearAttentionModuleConvergence,
  buildLinearAttentionStubBody,
} from "@/lib/verify/linear-attention-module-convergence";

describe("assertLinearAttentionModuleConvergence", () => {
  test("passes against the linear-attention module stub body", () => {
    expect(
      assertLinearAttentionModuleConvergence(buildLinearAttentionStubBody()),
    ).toBeNull();
  });

  test("fails when a required marker is missing", () => {
    const result = assertLinearAttentionModuleConvergence(
      "<div>Linear Attention</div>",
    );
    expect(result).toContain("missing expected content");
  });
});
