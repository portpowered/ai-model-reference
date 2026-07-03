import { describe, expect, test } from "bun:test";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import {
  probeGatedDeltaNetGraphAtViewport,
  verifyGatedDeltaNetGraphViewports,
} from "./gated-deltanet-module-graph-viewport-http";
import { RENDERED_QUALITY_VIEWPORTS } from "./rendered-quality-baseline";

const GATED_DELTANET_SLUG = "gated-deltanet";

describe("gated-deltanet module graph viewport probes", () => {
  test(
    "desktop and mobile viewports keep the graph visible, focusable, and non-overlapping",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: GATED_DELTANET_SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);
      const failure = await verifyGatedDeltaNetGraphViewports(html);

      expect(failure).toBeNull();
    },
    { timeout: 60_000 },
  );

  test.each([...RENDERED_QUALITY_VIEWPORTS])(
    "viewport $label exposes graph visibility and keyboard-safe variant tabs",
    async (viewport) => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: GATED_DELTANET_SLUG,
      });
      const probe = await probeGatedDeltaNetGraphAtViewport(
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
    { timeout: 60_000 },
  );

  test("canonical route remains /docs/modules/gated-deltanet", () => {
    expect(
      localDocsRoute({
        section: "modules",
        slug: GATED_DELTANET_SLUG,
      }),
    ).toBe("/docs/modules/gated-deltanet");
  });
});
