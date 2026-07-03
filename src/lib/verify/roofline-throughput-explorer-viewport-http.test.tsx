import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RooflineThroughputExplorerFromRegistry } from "@/features/roofline-throughput-explorer/RooflineThroughputExplorerFromRegistry";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunPlaywrightHttpVerifierUnitTests,
} from "./export-integration-probe-lock";
import { verifyRooflineThroughputExplorerViewports } from "./roofline-throughput-explorer-viewport-http";

describe("roofline throughput explorer viewport probes", () => {
  test(
    "desktop and mobile viewports keep roofline controls visible and non-overlapping",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const html = renderToStaticMarkup(
        <RooflineThroughputExplorerFromRegistry />,
      );
      const failure = await verifyRooflineThroughputExplorerViewports(html);

      expect(failure).toBeNull();
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );
});
