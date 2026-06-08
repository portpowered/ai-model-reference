import { describe, expect, test } from "bun:test";
import {
  assertSlidingWindowAttentionModuleConvergence,
  buildSlidingWindowAttentionStubBody,
} from "@/lib/verify/sliding-window-attention-module-convergence";

describe("assertSlidingWindowAttentionModuleConvergence", () => {
  test("passes against the sliding-window-attention module stub body", () => {
    expect(
      assertSlidingWindowAttentionModuleConvergence(
        buildSlidingWindowAttentionStubBody(),
      ),
    ).toBeNull();
  });

  test("fails when a required marker is missing", () => {
    const result = assertSlidingWindowAttentionModuleConvergence(
      "<div>Sliding-Window Attention</div>",
    );
    expect(result).toContain("missing expected content");
  });
});
