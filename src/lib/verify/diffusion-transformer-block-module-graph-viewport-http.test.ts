import { describe, expect, test } from "bun:test";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { DIFFUSION_TRANSFORMER_BLOCK_ROUTE } from "./diffusion-transformer-block-module-convergence";
import {
  probeDiffusionTransformerBlockGraphAtViewport,
  verifyDiffusionTransformerBlockGraphViewports,
} from "./diffusion-transformer-block-module-graph-viewport-http";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { RENDERED_QUALITY_VIEWPORTS } from "./rendered-quality-baseline";

const DIFFUSION_TRANSFORMER_BLOCK_SLUG = "diffusion-transformer-block";

describe("diffusion-transformer-block module graph viewport probes", () => {
  test(
    "desktop and mobile viewports keep the graph visible and within viewport width",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: DIFFUSION_TRANSFORMER_BLOCK_SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);
      const failure = await verifyDiffusionTransformerBlockGraphViewports(html);

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
        slug: DIFFUSION_TRANSFORMER_BLOCK_SLUG,
      });
      const probe = await probeDiffusionTransformerBlockGraphAtViewport(
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

  test("canonical route remains /docs/modules/diffusion-transformer-block", () => {
    expect(
      localDocsRoute({
        section: "modules",
        slug: DIFFUSION_TRANSFORMER_BLOCK_SLUG,
      }),
    ).toBe(DIFFUSION_TRANSFORMER_BLOCK_ROUTE);
  });
});
