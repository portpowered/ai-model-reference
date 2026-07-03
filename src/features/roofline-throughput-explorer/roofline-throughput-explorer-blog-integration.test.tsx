import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RooflineThroughputExplorerFromRegistry } from "@/features/roofline-throughput-explorer/RooflineThroughputExplorerFromRegistry";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import { getRooflineModelSizePresets } from "@/lib/content/roofline-model-size-presets";

const BLOG_SLUG = "roofline-throughput-explorer";

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
