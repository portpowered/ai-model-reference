import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RooflineThroughputExplorerFromRegistry } from "@/features/roofline-throughput-explorer/RooflineThroughputExplorerFromRegistry";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import { getRooflineModelSizePresets } from "@/lib/content/roofline-model-size-presets";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "@/lib/verify/export-integration-probe-lock";
import { verifyRooflineThroughputExplorerViewports } from "@/lib/verify/roofline-throughput-explorer-viewport-http";

const BLOG_SLUG = "roofline-throughput-explorer";
const ROOFLINE_BLOG_VIEWPORT_PROBE_TIMEOUT_MS = 120_000;

describe("roofline throughput explorer blog integration", () => {
  test("build-time wrapper passes registry-derived presets into the explorer", () => {
    const presets = getRooflineModelSizePresets();
    const html = renderToStaticMarkup(
      <RooflineThroughputExplorerFromRegistry />,
    );

    expect(presets.length).toBeGreaterThan(0);
    expect(html).toContain('data-roofline-throughput-explorer="explorer"');
    expect(html).toContain('data-testid="roofline-model-preset"');
    for (const preset of presets) {
      expect(html).toContain(preset.label);
    }
  });

  test("first blog post renders the registry-backed explorer on /blog/roofline-throughput-explorer", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe("/blog/roofline-throughput-explorer");
    expect(post.frontmatter.status).toBe("published");
    expect(html).toContain('data-roofline-throughput-explorer="explorer"');
    expect(html).toContain('data-testid="roofline-model-preset"');
    expect(html).toContain("Why throughput follows a roofline");
  });
});

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

      expect(failure).toBeNull(failure ?? undefined);
    },
    { timeout: ROOFLINE_BLOG_VIEWPORT_PROBE_TIMEOUT_MS },
  );
});
