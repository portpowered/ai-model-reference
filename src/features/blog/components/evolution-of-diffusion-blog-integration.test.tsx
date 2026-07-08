import { describe, expect, test } from "bun:test";
import { DEFAULT_GENERATION_EVOLUTION_BLOG_DATA } from "@/features/generation-evolution/generation-evolution-data";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { validatePublishedBlogPosts } from "@/lib/content/validate-blog-posts";

const BLOG_SLUG = "evolution-of-diffusion";

const EXPECTED_RELATED_DOC_IDS = [
  "concept.diffusion-model",
  "concept.denoising-generation",
  "module.u-net",
  "training-regime.diffusion-training-objective",
  "module.clip-image-tokenization",
  "paper.latent-diffusion",
  "module.diffusion-transformer-block",
  "concept.flow-matching",
  "concept.video-generation",
  "concept.world-model",
  "model.ltx-23",
  "model.cosmos-3",
] as const;

const EXPECTED_INLINE_DOC_HREFS = [
  "/docs/modules/diffusion-transformer-block",
  "/docs/concepts/flow-matching",
  "/docs/concepts/video-generation",
  "/docs/glossary/world-model",
  "/docs/models/ltx-23",
  "/docs/models/cosmos-3",
] as const;

const EXPECTED_RELATED_DOC_HREFS = [
  "/docs/glossary/diffusion-model",
  "/docs/glossary/denoising-generation",
  "/docs/modules/u-net",
  "/docs/training/diffusion-training-objective",
  "/docs/modules/clip-image-tokenization",
  "/docs/papers/latent-diffusion",
  "/docs/modules/diffusion-transformer-block",
  "/docs/concepts/flow-matching",
  "/docs/concepts/video-generation",
  "/docs/glossary/world-model",
  "/docs/models/ltx-23",
  "/docs/models/cosmos-3",
] as const;

describe("evolution of diffusion blog integration", () => {
  test("evolution-of-diffusion blog post renders the diffusion evolution arc on /blog/evolution-of-diffusion", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe("/blog/evolution-of-diffusion");
    expect(post.frontmatter.status).toBe("published");
    expect(post.frontmatter.relatedDocIds).toEqual([
      ...EXPECTED_RELATED_DOC_IDS,
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
    for (const href of EXPECTED_INLINE_DOC_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('data-testid="blog-related-docs"');
    for (const href of EXPECTED_RELATED_DOC_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).not.toContain('href="/docs/models/stable-diffusion"');
    expect(html).not.toContain("model.stable-diffusion");
    expect(html).toContain('data-blog-slug="evolution-of-diffusion"');
  });

  test("relatedDocIds and inline canonical links resolve for evolution-of-diffusion", async () => {
    const indexes = await loadRegistry();
    const post = await loadBlogPostFromDisk(BLOG_SLUG);

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("model.stable-diffusion")).toBe(
      false,
    );

    for (const relatedDocId of post.frontmatter.relatedDocIds) {
      const entry = getPublishedDocsEntryByRegistryId(relatedDocId);
      expect(entry).toBeDefined();
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(relatedDocId)).toBe(true);
      expect(entry?.url).toMatch(/^\/docs\//);
    }

    const validationErrors = await validatePublishedBlogPosts({ indexes });
    const blogErrors = validationErrors.filter((error) =>
      error.message.includes(`/blog/${BLOG_SLUG}`),
    );

    expect(blogErrors).toEqual([]);
  });
});
