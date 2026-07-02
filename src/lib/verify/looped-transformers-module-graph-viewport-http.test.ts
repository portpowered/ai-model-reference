import { describe, expect, test } from "bun:test";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { LOOPED_TRANSFORMERS_ROUTE } from "./looped-transformers-module-convergence";
import {
  probeLoopedTransformersGraphAtViewport,
  verifyLoopedTransformersGraphViewports,
} from "./looped-transformers-module-graph-viewport-http";
import { RENDERED_QUALITY_VIEWPORTS } from "./rendered-quality-baseline";

const LOOPED_TRANSFORMERS_SLUG = "looped-transformers";

describe("looped-transformers module graph viewport probes", () => {
  test(
    "desktop and mobile viewports keep the graph visible and within viewport width",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: LOOPED_TRANSFORMERS_SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);
      const failure = await verifyLoopedTransformersGraphViewports(html);

      expect(failure).toBeNull();
    },
    { timeout: 60_000 },
  );

  test.each([...RENDERED_QUALITY_VIEWPORTS])(
    "viewport $label exposes graph visibility for the compute-flow graph",
    async (viewport) => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: LOOPED_TRANSFORMERS_SLUG,
      });
      const probe = await probeLoopedTransformersGraphAtViewport(
        renderModuleDocsShell(loadedPage),
        { width: viewport.width, height: viewport.height },
      );

      expect(probe.graphVisible).toBe(true);
      expect(probe.graphFitsViewportWidth).toBe(true);
      if (viewport.id === "desktop") {
        expect(probe.overlappingNodePairs).toBe(0);
      }
    },
    { timeout: 60_000 },
  );

  test("canonical route remains /docs/modules/looped-transformers", () => {
    expect(
      localDocsRoute({
        section: "modules",
        slug: LOOPED_TRANSFORMERS_SLUG,
      }),
    ).toBe(LOOPED_TRANSFORMERS_ROUTE);
  });
});
