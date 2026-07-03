import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import TagsIndexPage from "@/app/(site)/tags/page";

describe("Phase 2/3 reconciliation foundational tag page render (US-006)", () => {
  test("foundations landing lists batch 017 resources grouped by kind", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "foundations" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Foundations");
    expect(html).toContain("Glossary");
    expect(html).toContain("Concept");
    expect(html).toContain('href="/docs/modules/rope"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/concepts/feed-forward-network"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/glossary/normalization"');
    expect(html).toContain('href="/docs/glossary/skip-connection"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/search?tag=foundations"');
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  test("model-family landing lists all four published model family glossary pages", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "model-family" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Model family");
    expect(html).toContain("Published model-family glossary pages");
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/glossary/world-model"');
    expect(html).toContain('href="/search?tag=model-family"');
  });

  test("tags index renders foundational tag entries with landing links", async () => {
    const page = await TagsIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Foundations");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("Taxonomy");
    expect(html).toContain('href="/tags/taxonomy"');
    expect(html).toContain("Model family");
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain("Token-to-probability chain");
    expect(html).toContain('href="/tags/token-to-probability-chain"');
  });
});
