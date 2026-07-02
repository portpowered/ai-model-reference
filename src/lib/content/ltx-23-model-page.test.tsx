/**
 * Retained per derived-page-validation policy: LTX-2.3 route rendering, lead
 * copy, module and training summaries, and related navigation cannot be
 * expressed as derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { getModelById } from "@/lib/content/registry-runtime";

describe("ltx-23 model page", () => {
  test("loads the canonical published LTX-2.3 model bundle", async () => {
    const page = await loadModelPage("ltx-23");

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.registryId).toBe("model.ltx-23");
    expect(page.frontmatter.status).toBe("published");
  });

  test("loads a published model page with diffusion-transformer lead copy", async () => {
    const record = getModelById("model.ltx-23");
    const page = await loadModelPage("ltx-23");

    expect(record?.status).toBe("published");
    expect(record?.moduleIds).toEqual(
      expect.arrayContaining(["module.cross-attention"]),
    );
    expect(record?.trainingRegimeIds).toEqual(
      expect.arrayContaining(["training-regime.diffusion-training-objective"]),
    );
    expect(page.messages.title).toBe("LTX-2.3");
    expect(page.messages.openingSummary).toContain("LTX-2.3");
    expect(page.messages.openingSummary).toContain("diffusion-transformer");
    expect(page.messages.openingSummary).toContain("synchronized video and audio");
  });

  test("renders module, training, and related sections without empty placeholders", async () => {
    const page = await loadModelPage("ltx-23");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/latent-space"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('id="important-modules"');
    expect(html).toContain("cross-attention");
    expect(html).toContain(
      'href="/docs/training/diffusion-training-objective"',
    );
    expect(html).not.toContain("No modules listed yet.");
    expect(html).not.toContain("No training regimes listed yet.");
    expect(html).not.toContain("No linked paper pages listed yet.");
  });
});
