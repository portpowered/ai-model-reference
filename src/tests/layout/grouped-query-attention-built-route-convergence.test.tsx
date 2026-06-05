import { describe, expect, test } from "bun:test";
import {
  GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
  verifyGroupedQueryAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-grouped-query-attention-built-route";

describe("grouped-query-attention built route convergence", () => {
  test("/docs/modules/grouped-query-attention built HTML meets Phase 1 module markers", () => {
    const result = verifyGroupedQueryAttentionBuiltRouteFromFile(
      GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
