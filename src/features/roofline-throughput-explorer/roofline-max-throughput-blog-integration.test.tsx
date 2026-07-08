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
import { registryRecordHref } from "@/lib/content/registry-linking";
import { getConceptById, getSystemById } from "@/lib/content/registry-runtime";
import { getRooflineModelSizePresets } from "@/lib/content/roofline-model-size-presets";

const BLOG_SLUG = "roofline-max-throughput";

const RELATED_DOC_IDS = [
  "concept.roofline-model",
  "concept.memory-bandwidth",
  "concept.flops",
  "concept.tokens-per-second",
  "concept.prefill",
  "concept.decode",
  "concept.prefill-decode-split",
  "concept.kv-cache",
  "system.inference-engine",
] as const;

function relatedDocHref(registryId: (typeof RELATED_DOC_IDS)[number]): string {
  const record = registryId.startsWith("system.")
    ? getSystemById(registryId)
    : getConceptById(registryId);
  const href = record ? registryRecordHref(record) : undefined;
  if (!href) {
    throw new Error(`expected published href for ${registryId}`);
  }
  return href;
}

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

  test("published post links to canonical throughput references inline and via BlogRelatedDocs", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(post.frontmatter.relatedDocIds).toEqual([...RELATED_DOC_IDS]);
    expect(html).toContain('data-testid="blog-related-docs"');

    for (const registryId of RELATED_DOC_IDS) {
      const href = relatedDocHref(registryId);
      expect(html).toContain(`href="${href}"`);
      expect(html).not.toContain(registryId);
    }
  });
});
