import { describe, expect, test } from "bun:test";
import {
  assertMultiTokenPredictionModuleConvergence,
  buildMultiTokenPredictionStubBody,
} from "./multi-token-prediction-module-convergence";

describe("assertMultiTokenPredictionModuleConvergence", () => {
  test("passes against the multi-token-prediction module stub body", () => {
    expect(
      assertMultiTokenPredictionModuleConvergence(
        buildMultiTokenPredictionStubBody(),
      ),
    ).toBeNull();
  });

  test("fails when a required marker is missing", () => {
    const result = assertMultiTokenPredictionModuleConvergence(
      "<div>Multi-Token Prediction</div>",
    );
    expect(result).toContain("missing expected content");
  });
});
