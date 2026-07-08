import { describe, expect, test } from "bun:test";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { RENDERED_QUALITY_VIEWPORTS } from "./rendered-quality-baseline";
import {
  probeUNetModuleGraphAtViewport,
  verifyUNetModuleGraphViewports,
} from "./u-net-module-graph-viewport-http";

const U_NET_SLUG = "u-net";
const U_NET_GRAPH_VIEWPORT_PROBE_TIMEOUT_MS = 120_000;

describe("u-net module graph viewport probes (u-net-module-page-003)", () => {
  test(
    "desktop and mobile viewports keep the U-shaped graph visible with skip edges",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: U_NET_SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);
      const failure = await verifyUNetModuleGraphViewports(html);

      expect(failure).toBeNull();
    },
    { timeout: U_NET_GRAPH_VIEWPORT_PROBE_TIMEOUT_MS },
  );

  test.each([...RENDERED_QUALITY_VIEWPORTS])(
    "viewport $label exposes skip-connection edges for the compute-flow graph",
    async (viewport) => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: U_NET_SLUG,
      });
      const probe = await probeUNetModuleGraphAtViewport(
        renderModuleDocsShell(loadedPage),
        { width: viewport.width, height: viewport.height },
      );

      expect(probe.graphVisible).toBe(true);
      expect(probe.graphFitsViewportWidth).toBe(true);
      expect(probe.residualEdgeCount).toBeGreaterThanOrEqual(2);
      if (viewport.id === "desktop") {
        expect(probe.overlappingNodePairs).toBe(0);
      }
    },
    { timeout: U_NET_GRAPH_VIEWPORT_PROBE_TIMEOUT_MS },
  );

  test("canonical route remains /docs/modules/u-net", () => {
    expect(
      localDocsRoute({
        section: "modules",
        slug: U_NET_SLUG,
      }),
    ).toBe("/docs/modules/u-net");
  });
});
