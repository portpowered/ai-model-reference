import { describe, expect, test } from "bun:test";
import {
  GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
  verifyGroupedQueryAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-grouped-query-attention-built-route";
import { shouldRunBuiltHtmlFileConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

describe("grouped-query-attention built route convergence", () => {
  test("/docs/modules/grouped-query-attention built HTML meets Phase 1 module markers", () => {
    if (!shouldRunBuiltHtmlFileConvergenceTests()) {
      return;
    }

    const result = verifyGroupedQueryAttentionBuiltRouteFromFile(
      GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
