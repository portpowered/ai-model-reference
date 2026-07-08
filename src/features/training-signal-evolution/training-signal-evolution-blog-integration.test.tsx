import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrainingSignalEvolutionBlogVisual } from "@/features/training-signal-evolution/TrainingSignalEvolutionBlogVisual";
import { TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME } from "@/features/training-signal-evolution/training-signal-evolution-data";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";

const BLOG_SLUG = "llms-no-longer-wholly-reliant-on-the-internet";

describe("training signal evolution timeline blog integration", () => {
  test("build-time wrapper renders the default timeline without client fetches", () => {
    const html = renderToStaticMarkup(<TrainingSignalEvolutionBlogVisual />);

    expect(html).toContain('data-training-signal-evolution-state="success"');
    expect(html).toContain(TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME);
    expect(html).toContain("Broad web-scale pretraining");
    expect(html).toContain("Reinforcement learning from human feedback (RLHF)");
    expect(html).toContain(
      "Reinforcement learning with verifiable rewards (RLVR)",
    );
    expect(html).toContain("On-policy distillation and self-distillation");
  });

  test("llms-no-longer-wholly-reliant-on-the-internet blog post renders prose timeline sections", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe(
      "/blog/llms-no-longer-wholly-reliant-on-the-internet",
    );
    expect(post.frontmatter.status).toBe("published");
    expect(html).toContain("How training signals accumulated over time");
    expect(html).toContain("Few-shot prompting");
    expect(html).toContain("Instruction tuning");
    expect(html).toContain("Key post-training and feedback loops");
    expect(html).toContain(
      "Internet-scale pretraining remains the foundation of modern LLMs",
    );
  });
});
