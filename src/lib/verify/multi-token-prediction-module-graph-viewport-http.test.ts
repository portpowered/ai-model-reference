import { describe, expect, test } from "bun:test";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import {
  probeMultiTokenPredictionGraphAtViewport,
  verifyMultiTokenPredictionGraphViewports,
} from "./multi-token-prediction-module-graph-viewport-http";
import { RENDERED_QUALITY_VIEWPORTS } from "./rendered-quality-baseline";

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

  test.each([...RENDERED_QUALITY_VIEWPORTS])(
    "viewport $label exposes graph visibility and keyboard-safe variant tabs",
    async (viewport) => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: MULTI_TOKEN_PREDICTION_SLUG,
      });
      const probe = await probeMultiTokenPredictionGraphAtViewport(
        renderModuleDocsShell(loadedPage),
        { width: viewport.width, height: viewport.height },
      );

      expect(probe.graphVisible).toBe(true);
      expect(probe.variantTabsFocusable).toBe(true);
      expect(probe.graphFitsViewportWidth).toBe(true);
      if (viewport.id === "desktop") {
        expect(probe.overlappingNodePairs).toBe(0);
      }
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
