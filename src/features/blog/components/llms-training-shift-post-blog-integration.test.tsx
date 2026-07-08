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
    expect(html).toContain("How training signals accumulated over time");
    expect(html).toContain("Few-shot prompting");
    expect(html).toContain("inference-time");
    expect(html).toContain("without any weight update");
    expect(html).toContain("Mid-training");
    expect(html).toContain("bridge that narrows a wide foundation");
    expect(html).toContain("Instruction tuning");
    expect(html).toContain("Preference feedback");
    expect(html).toContain("Verifiable reward loops");
    expect(html).toContain("Synthetic and model-generated traces");
    expect(html).toContain("On-policy distillation and self-distillation");
    expect(html).toContain("Key post-training and feedback loops");
    expect(html).toContain("Reinforcement learning from human feedback (RLHF)");
    expect(html).toContain(
      "Reinforcement learning from verifiable rewards (RLVR)",
    );
    expect(html).toContain(
      "supervised learning from prompt-and-answer demonstrations",
    );
    expect(html).toContain("preference-driven behavior shaping");
    expect(html).toContain("externally checkable outcomes");
    expect(html).toContain("current or recently updated policy");
    expect(html).toContain(
      "generated traces, answers, critiques, or trajectories",
    );
    expect(html).toContain(
      "Comparing signal source, scoring, and weight updates",
    );
    expect(html).toContain("without changing weights");
    expect(html).toContain("Post-training does not erase pretraining");
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/mid-training"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).not.toContain("training-regime.pretraining");
  });
});
