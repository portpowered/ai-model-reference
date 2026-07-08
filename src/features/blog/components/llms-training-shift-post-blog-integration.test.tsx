import { describe, expect, test } from "bun:test";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";

const BLOG_SLUG = "llms-no-longer-wholly-reliant-on-the-internet";

describe("llms training shift post blog integration", () => {
  test("published blog post renders on /blog/llms-no-longer-wholly-reliant-on-the-internet", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe(
      "/blog/llms-no-longer-wholly-reliant-on-the-internet",
    );
    expect(post.frontmatter.status).toBe("published");
    expect(post.frontmatter.messageNamespace).toBe("local");
    expect(post.frontmatter.assetNamespace).toBe("local");
    expect(post.frontmatter.authors).toEqual(["site-team"]);
    expect(post.frontmatter.relatedDocIds).toEqual([
      "training-regime.pretraining",
      "training-regime.mid-training",
      "training-regime.post-training",
    ]);
    expect(html).toContain("LLMs are no longer wholly reliant on the internet");
    expect(html).toContain(
      "Internet-scale pretraining remains the foundation of modern LLMs",
    );
    expect(html).toContain("The training-signal shift");
    expect(html).toContain(
      "additional signals reshape behavior: curated demonstrations",
    );
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/mid-training"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).not.toContain("training-regime.pretraining");
  });
});
