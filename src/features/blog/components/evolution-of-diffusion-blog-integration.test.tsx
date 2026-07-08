import { describe, expect, test } from "bun:test";
import { DEFAULT_GENERATION_EVOLUTION_BLOG_DATA } from "@/features/generation-evolution/generation-evolution-data";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";

const BLOG_SLUG = "evolution-of-diffusion";

describe("evolution of diffusion blog integration", () => {
  test("evolution-of-diffusion blog post renders the early diffusion arc on /blog/evolution-of-diffusion", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe("/blog/evolution-of-diffusion");
    expect(post.frontmatter.status).toBe("published");
    expect(post.frontmatter.relatedDocIds).toEqual([
      "concept.diffusion-model",
      "concept.denoising-generation",
      "module.u-net",
      "training-regime.diffusion-training-objective",
      "module.clip-image-tokenization",
      "paper.latent-diffusion",
    ]);
    expect(html).toContain(
      "How diffusion generation evolved from pixel U-Nets to transformers, flow matching, and modern video models",
    );
    expect(html).toContain("Evolution at a glance");
    expect(html).toContain('data-generation-evolution-state="success"');
    expect(html).toContain('data-generation-evolution-legend="true"');
    expect(html).toContain(DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.title);
    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      expect(html).toContain(`data-generation-evolution-stage="${stage.id}"`);
      expect(html).toContain(stage.label);
    }
    expect(html).toContain("Denoising diffusion and U-Net backbones");
    expect(html).toContain("Denoising diffusion probabilistic models");
    expect(html).toContain("CLIP-conditioned image systems");
    expect(html).toContain("Contrastive Language-Image Pre-training");
    expect(html).toContain("Latent diffusion and Stable Diffusion");
    expect(html).toContain("Diffusion transformers as the denoising backbone");
    expect(html).toContain("Flow matching as an objective shift");
    expect(html).toContain("Modern open video and world-model examples");
    expect(html).toContain("LTX-2.3");
    expect(html).toContain("Cosmos 3");
    expect(html).toContain('href="/docs/modules/diffusion-transformer-block"');
    expect(html).toContain('href="/docs/concepts/flow-matching"');
    expect(html).toContain('href="/docs/concepts/video-generation"');
    expect(html).toContain('href="/docs/glossary/world-model"');
    expect(html).toContain('href="/docs/models/ltx-23"');
    expect(html).toContain('href="/docs/models/cosmos-3"');
    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/modules/u-net"');
    expect(html).toContain(
      'href="/docs/training/diffusion-training-objective"',
    );
    expect(html).toContain('href="/docs/modules/clip-image-tokenization"');
    expect(html).toContain('href="/docs/papers/latent-diffusion"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).not.toContain("stable-diffusion");
    expect(html).not.toContain("model.stable-diffusion");
    expect(html).toContain('data-blog-slug="evolution-of-diffusion"');
  });
});
