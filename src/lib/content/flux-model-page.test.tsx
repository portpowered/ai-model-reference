/**
 * Retained per derived-page-validation policy: Flux route rendering, lead copy,
 * module and training summaries, and related navigation cannot be expressed as
 * derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { getModelById } from "@/lib/content/registry-runtime";

describe("flux model page", () => {
  test("loads the canonical published Flux model bundle", async () => {
    const page = await loadModelPage("flux");

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.registryId).toBe("model.flux");
    expect(page.frontmatter.status).toBe("published");
  });

  test("loads a published model page with rectified-flow lead copy", async () => {
    const record = getModelById("model.flux");
    const page = await loadModelPage("flux");

    expect(record?.status).toBe("published");
    expect(record?.moduleIds).toEqual(
      expect.arrayContaining(["module.diffusion-transformer-block"]),
    );
    expect(record?.trainingRegimeIds).toEqual(
      expect.arrayContaining(["training-regime.diffusion-training-objective"]),
    );
    expect(page.messages.title).toBe("Flux");
    expect(page.messages.openingSummary).toContain("Black Forest Labs");
    expect(page.messages.openingSummary).toContain("rectified-flow");
    expect(page.messages.openingSummary).toContain("latent space");
  });

  test("renders module, training, and related sections without empty placeholders", async () => {
    const page = await loadModelPage("flux");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/concepts/latent-space"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/concepts/classifier-free-guidance"');
    expect(html).toContain('href="/docs/models/clip"');
    expect(html).toContain('href="/docs/concepts/text-to-image-conditioning"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('id="important-modules"');
    expect(html).toContain("diffusion transformer");
    expect(html).toContain(
      'href="/docs/training/diffusion-training-objective"',
    );
    expect(html).toContain('id="references"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.flux-architecture"');
    expect(html).toContain("https://bfl.ai/blog/24-08-01-bfl");
    expect(html).toContain("https://github.com/black-forest-labs/flux");
    expect(html).toContain(
      "https://huggingface.co/black-forest-labs/FLUX.1-dev",
    );
    expect(html).not.toContain("No modules listed yet.");
    expect(html).not.toContain("No training regimes listed yet.");
    expect(html).not.toContain("No linked paper pages listed yet.");
  });
});
