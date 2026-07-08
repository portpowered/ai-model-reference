import { describe, expect, test } from "bun:test";
import { TRAINING_SIGNAL_BAND_LABELS } from "@/features/graphs/training-signal/training-signal-band-keys";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { resolveRelatedRegistryDocs } from "@/lib/content/related-registry-docs";

const BLOG_SLUG = "llms-no-longer-wholly-reliant-on-the-internet";

const EXPECTED_RELATED_DOC_IDS = [
  "training-regime.pretraining",
  "training-regime.mid-training",
  "training-regime.post-training",
  "training-regime.instruction-tuning",
  "training-regime.rlhf",
  "training-regime.rlvr",
  "concept.synthetic-data",
  "training-regime.distillation",
  "training-regime.on-policy-distillation",
  "concept.on-policy",
] as const;

const EXPECTED_RELATED_DOC_HREFS = [
  "/docs/training/pretraining",
  "/docs/training/mid-training",
  "/docs/training/post-training",
  "/docs/training/instruction-tuning",
  "/docs/training/rlhf",
  "/docs/training/rlvr",
  "/docs/concepts/synthetic-data",
  "/docs/training/distillation",
  "/docs/training/on-policy-distillation",
  "/docs/concepts/on-policy",
] as const;

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
      ...EXPECTED_RELATED_DOC_IDS,
    ]);
    for (const registryId of EXPECTED_RELATED_DOC_IDS) {
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(registryId)).toBe(true);
    }
    const resolvedRelatedDocs = resolveRelatedRegistryDocs(
      post.frontmatter.relatedDocIds,
    );
    expect(resolvedRelatedDocs.unavailable).toEqual([]);
    expect(resolvedRelatedDocs.available.map((item) => item.href)).toEqual([
      ...EXPECTED_RELATED_DOC_HREFS,
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
    expect(html).toContain("conceptual illustration");
    expect(html).toContain('data-training-signal-chart="ready"');
    expect(html).toContain('data-value-mode="conceptual"');
    expect(html).toContain("Conceptual illustration");
    expect(html).toContain(
      "Illustrative training-signal mix across three eras",
    );
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.pretrainingCorpus);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.instructionSupervised);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.preferenceSignal);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.verifiableRl);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.syntheticTraces);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.onPolicyDistillation);
    expect(html).toContain("Conceptual chart");
    expect(html).toContain(
      "communicate direction and relative emphasis, not quantitative market shares",
    );
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
    expect(html).toContain('data-testid="blog-related-docs"');
    for (const href of EXPECTED_RELATED_DOC_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    for (const registryId of EXPECTED_RELATED_DOC_IDS) {
      expect(html).not.toContain(registryId);
    }
    expect(html).not.toContain(
      'data-testid="related-registry-docs-unavailable"',
    );
  });
});
