import { describe, expect, test } from "bun:test";
import {
  MULTI_HEAD_LATENT_ATTENTION_BUILT_HTML_PATH,
  verifyMultiHeadLatentAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-multi-head-latent-attention-built-route";
import { shouldRunBuiltHtmlFileConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

describe("multi-head-latent-attention built route convergence", () => {
  test("/docs/modules/multi-head-latent-attention built HTML meets module markers", () => {
    if (!shouldRunBuiltHtmlFileConvergenceTests()) {
      return;
    }

    const result = verifyMultiHeadLatentAttentionBuiltRouteFromFile(
      MULTI_HEAD_LATENT_ATTENTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
