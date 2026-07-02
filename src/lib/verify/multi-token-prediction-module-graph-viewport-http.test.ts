import { describe, expect, test } from "bun:test";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { verifyMultiTokenPredictionGraphViewports } from "./multi-token-prediction-module-graph-viewport-http";

const MULTI_TOKEN_PREDICTION_SLUG = "multi-token-prediction";
/** Serialized CI Playwright launches can approach the default 60s Bun budget. */
const MULTI_TOKEN_PREDICTION_GRAPH_VIEWPORT_PROBE_TIMEOUT_MS = 120_000;

describe("multi-token-prediction module graph viewport probes", () => {
  test(
    "desktop and mobile viewports keep the graph visible, focusable, and non-overlapping",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: MULTI_TOKEN_PREDICTION_SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);
      const failure = await verifyMultiTokenPredictionGraphViewports(html);

      expect(failure).toBeNull();
    },
    { timeout: MULTI_TOKEN_PREDICTION_GRAPH_VIEWPORT_PROBE_TIMEOUT_MS },
  );

  test("canonical route remains /docs/modules/multi-token-prediction", () => {
    expect(
      localDocsRoute({
        section: "modules",
        slug: MULTI_TOKEN_PREDICTION_SLUG,
      }),
    ).toBe("/docs/modules/multi-token-prediction");
  });
});
