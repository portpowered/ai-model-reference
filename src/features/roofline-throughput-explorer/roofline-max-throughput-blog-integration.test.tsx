import { describe, expect, test } from "bun:test";
import {
  ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL,
  ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL,
} from "@/features/roofline-throughput-explorer/roofline-throughput-explorer-controls";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import { getRooflineModelSizePresets } from "@/lib/content/roofline-model-size-presets";

const BLOG_SLUG = "roofline-max-throughput";

describe("roofline max throughput blog integration", () => {
  test("published post embeds the registry-backed explorer with model presets", async () => {
    const presets = getRooflineModelSizePresets();
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe("/blog/roofline-max-throughput");
    expect(post.frontmatter.status).toBe("published");
    expect(html).toContain("Explore the throughput bound");
    expect(html).toContain('data-roofline-throughput-explorer="explorer"');
    expect(html).toContain('data-testid="roofline-model-preset"');
    expect(html).toContain(ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL);
    expect(html).toContain(ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL);
    expect(presets.length).toBeGreaterThan(0);
    for (const preset of presets) {
      expect(html).toContain(preset.label);
    }
  });
});
