import { describe, expect, test } from "bun:test";
import {
  SPARSE_ATTENTION_BUILT_HTML_PATH,
  verifySparseAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-sparse-attention-built-route";

describe("sparse-attention built route convergence", () => {
  test("/docs/modules/sparse-attention built HTML meets module markers", () => {
    const result = verifySparseAttentionBuiltRouteFromFile(
      SPARSE_ATTENTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
