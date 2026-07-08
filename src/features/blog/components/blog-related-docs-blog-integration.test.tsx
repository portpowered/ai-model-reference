import { describe, expect, test } from "bun:test";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import { resolveRelatedRegistryDocs } from "@/lib/content/related-registry-docs";

const ROOFLINE_EXPLORER_SLUG = "roofline-throughput-explorer";
const ROOFLINE_MAX_THROUGHPUT_SLUG = "roofline-max-throughput";

const ROOFLINE_MAX_THROUGHPUT_RELATED_DOC_IDS = [
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

const ROOFLINE_MAX_THROUGHPUT_INLINE_LINK_HREFS = [
  "/docs/concepts/flops",
  "/docs/glossary/tokens-per-second",
  "/docs/glossary/decode",
  "/docs/concepts/memory-bandwidth",
  "/docs/concepts/roofline-model",
  "/docs/concepts/prefill",
  "/docs/concepts/prefill-decode-split",
  "/docs/concepts/kv-cache",
  "/docs/systems/inference-engine",
] as const;

describe("blog related docs integration", () => {
  test("published blog post renders explicit relatedDocIds as compact docs links", async () => {
    const post = await loadBlogPostFromDisk(ROOFLINE_EXPLORER_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(ROOFLINE_EXPLORER_SLUG)).toBe(
      "/blog/roofline-throughput-explorer",
    );
    expect(post.frontmatter.relatedDocIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
    ]);
    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).not.toContain("concept.prefill");
    expect(html).not.toContain("concept.decode");
    expect(html).not.toContain("concept.kv-cache");
  });

  test("roofline max throughput post resolves canonical related docs and inline links", async () => {
    const post = await loadBlogPostFromDisk(ROOFLINE_MAX_THROUGHPUT_SLUG);
    const html = renderBlogPostShell(post);
    const resolved = resolveRelatedRegistryDocs(
      ROOFLINE_MAX_THROUGHPUT_RELATED_DOC_IDS,
    );

    expect(blogPostHref(ROOFLINE_MAX_THROUGHPUT_SLUG)).toBe(
      "/blog/roofline-max-throughput",
    );
    expect(post.frontmatter.relatedDocIds).toEqual([
      ...ROOFLINE_MAX_THROUGHPUT_RELATED_DOC_IDS,
    ]);
    expect(resolved.unavailable).toEqual([]);
    expect(resolved.available).toHaveLength(
      ROOFLINE_MAX_THROUGHPUT_RELATED_DOC_IDS.length,
    );

    expect(html).toContain('data-testid="blog-related-docs"');
    for (const item of resolved.available) {
      expect(html).toContain(`href="${item.href}"`);
      expect(html).not.toContain(item.registryId);
    }

    for (const href of ROOFLINE_MAX_THROUGHPUT_INLINE_LINK_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
