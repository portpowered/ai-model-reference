import { describe, expect, test } from "bun:test";
import {
  MULTI_TOKEN_PREDICTION_BUILT_HTML_PATH,
  verifyMultiTokenPredictionBuiltRouteFromFile,
} from "@/lib/build/verify-multi-token-prediction-built-route";
import { shouldRunBuiltHtmlFileConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

describe("multi-token-prediction built route convergence", () => {
  test("/docs/modules/multi-token-prediction built HTML meets module markers", () => {
    if (!shouldRunBuiltHtmlFileConvergenceTests()) {
      return;
    }

    const result = verifyMultiTokenPredictionBuiltRouteFromFile(
      MULTI_TOKEN_PREDICTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
