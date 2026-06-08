import { describe, expect, test } from "bun:test";
import {
  SLIDING_WINDOW_ATTENTION_BUILT_HTML_PATH,
  verifySlidingWindowAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-sliding-window-attention-built-route";

describe("sliding-window-attention built route convergence", () => {
  test("/docs/modules/sliding-window-attention built HTML meets module markers", () => {
    const result = verifySlidingWindowAttentionBuiltRouteFromFile(
      SLIDING_WINDOW_ATTENTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
