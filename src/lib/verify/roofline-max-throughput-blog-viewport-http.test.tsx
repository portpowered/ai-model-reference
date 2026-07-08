import { describe, expect, test } from "bun:test";
import { loadBlogPostFromDisk } from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { verifyRooflineThroughputExplorerViewports } from "./roofline-throughput-explorer-viewport-http";

const BLOG_SLUG = "roofline-max-throughput";
const ROOFLINE_VIEWPORT_PROBE_TIMEOUT_MS = 120_000;

describe("roofline max throughput blog viewport probes", () => {
  test(
    "blog post explorer markup keeps desktop and mobile control regions visible and non-overlapping",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }

      const post = await loadBlogPostFromDisk(BLOG_SLUG);
      const html = renderBlogPostShell(post);
      const failure = await verifyRooflineThroughputExplorerViewports(html);

      expect(failure).toBeNull();
    },
    { timeout: ROOFLINE_VIEWPORT_PROBE_TIMEOUT_MS },
  );
});
