import { describe, expect, test } from "bun:test";
import {
  LINEAR_ATTENTION_BUILT_HTML_PATH,
  verifyLinearAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-linear-attention-built-route";
import { shouldRunBuiltHtmlFileConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

describe("linear-attention built route convergence", () => {
  test("/docs/modules/linear-attention built HTML meets module markers", () => {
    if (!shouldRunBuiltHtmlFileConvergenceTests()) {
      return;
    }

    const result = verifyLinearAttentionBuiltRouteFromFile(
      LINEAR_ATTENTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
