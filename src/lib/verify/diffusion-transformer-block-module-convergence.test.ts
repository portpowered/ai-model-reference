import { describe, expect, test } from "bun:test";
import {
  assertDiffusionTransformerBlockModuleConvergence,
  buildDiffusionTransformerBlockStubBody,
} from "./diffusion-transformer-block-module-convergence";

describe("assertDiffusionTransformerBlockModuleConvergence", () => {
  test("passes against the diffusion-transformer-block module stub body", () => {
    expect(
      assertDiffusionTransformerBlockModuleConvergence(
        buildDiffusionTransformerBlockStubBody(),
      ),
    ).toBeNull();
  });

  test("fails when a required marker is missing", () => {
    const result = assertDiffusionTransformerBlockModuleConvergence(
      "<div>Diffusion Transformer Block</div>",
    );
    expect(result).toContain("missing expected content");
  });
});
