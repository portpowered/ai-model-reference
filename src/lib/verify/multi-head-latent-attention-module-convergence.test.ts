import { describe, expect, test } from "bun:test";
import {
  assertMultiHeadLatentAttentionModuleConvergence,
  buildMultiHeadLatentAttentionStubBody,
} from "@/lib/verify/multi-head-latent-attention-module-convergence";

describe("assertMultiHeadLatentAttentionModuleConvergence", () => {
  test("passes against the MLA module stub body", () => {
    expect(
      assertMultiHeadLatentAttentionModuleConvergence(
        buildMultiHeadLatentAttentionStubBody(),
      ),
    ).toBeNull();
  });

  test("fails when a required marker is missing", () => {
    const result = assertMultiHeadLatentAttentionModuleConvergence(
      "<div>Multi-Head Latent Attention</div>",
    );
    expect(result).toContain("missing expected content");
  });
});
