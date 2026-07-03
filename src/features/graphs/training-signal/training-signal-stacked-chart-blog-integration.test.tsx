import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrainingSignalStackedChartFromDefault } from "@/features/graphs/training-signal/TrainingSignalStackedChartFromDefault";
import { TRAINING_SIGNAL_BAND_LABELS } from "@/features/graphs/training-signal/training-signal-band-keys";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";

const BLOG_SLUG = "llm-training-shift";

describe("training signal stacked chart blog integration", () => {
  test("build-time wrapper renders the default conceptual chart without client fetches", () => {
    const html = renderToStaticMarkup(
      <TrainingSignalStackedChartFromDefault />,
    );

    expect(html).toContain('data-training-signal-chart="ready"');
    expect(html).toContain('data-value-mode="conceptual"');
    expect(html).toContain("Conceptual illustration");
    for (const bandLabel of Object.values(TRAINING_SIGNAL_BAND_LABELS)) {
      expect(html).toContain(bandLabel);
    }
  });

  test("llm-training-shift blog post renders the stacked chart on /blog/llm-training-shift", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe("/blog/llm-training-shift");
    expect(post.frontmatter.status).toBe("published");
    expect(html).toContain('data-training-signal-chart="ready"');
    expect(html).toContain(
      "How LLM training signals shifted beyond the pretraining corpus",
    );
    expect(html).toContain("Conceptual illustration");
    expect(html).toContain(
      "Illustrative training-signal mix across three eras",
    );
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.pretrainingCorpus);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.onPolicyDistillation);
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).not.toContain('href="/tags/training"');
    expect(html).not.toContain('href="/tags/post-training"');
  });
});
