import { describe, expect, test } from "bun:test";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";

const ROOFLINE_BLOG_SLUG = "roofline-throughput-explorer";
const TRAINING_SHIFT_BLOG_SLUG =
  "llms-no-longer-wholly-reliant-on-the-internet";

const TRAINING_SHIFT_RELATED_DOC_IDS = [
  "training-regime.pretraining",
  "training-regime.mid-training",
  "training-regime.post-training",
  "training-regime.instruction-tuning",
  "training-regime.rlhf",
  "training-regime.rlvr",
  "training-regime.distillation",
  "training-regime.on-policy-distillation",
  "concept.synthetic-data",
  "concept.on-policy",
] as const;

describe("blog related docs integration", () => {
  test("published blog post renders explicit relatedDocIds as compact docs links", async () => {
    const post = await loadBlogPostFromDisk(ROOFLINE_BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(ROOFLINE_BLOG_SLUG)).toBe(
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

  test("llms-no-longer-wholly-reliant-on-the-internet renders landed training-regime and concept related docs", async () => {
    const post = await loadBlogPostFromDisk(TRAINING_SHIFT_BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(TRAINING_SHIFT_BLOG_SLUG)).toBe(
      "/blog/llms-no-longer-wholly-reliant-on-the-internet",
    );
    expect(post.frontmatter.relatedDocIds).toEqual([
      ...TRAINING_SHIFT_RELATED_DOC_IDS,
    ]);
    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/mid-training"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/docs/training/instruction-tuning"');
    expect(html).toContain('href="/docs/training/rlhf"');
    expect(html).toContain('href="/docs/training/rlvr"');
    expect(html).toContain('href="/docs/training/distillation"');
    expect(html).toContain('href="/docs/training/on-policy-distillation"');
    expect(html).toContain('href="/docs/concepts/synthetic-data"');
    expect(html).toContain('href="/docs/concepts/on-policy"');
    expect(html).toContain(">RLHF</a>");
    expect(html).toContain(">RLVR</a>");
    expect(html).toContain(">Synthetic data</a>");
    expect(html).not.toContain("training-regime.rlhf");
    expect(html).not.toContain("training-regime.rlvr");
    expect(html).not.toContain("concept.synthetic-data");
    expect(html).not.toContain("concept.on-policy");
  });
});
