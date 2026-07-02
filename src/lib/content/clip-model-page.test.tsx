/**
 * Retained per derived-page-validation policy: CLIP route rendering, acronym
 * expansion in lead copy, architecture graph output, and inline glossary links
 * cannot be expressed as derived bundle invariants.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { getModelById } from "@/lib/content/registry-runtime";

describe("clip model page", () => {
  test("loads the canonical published CLIP model bundle", async () => {
    const page = await loadModelPage("clip");

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.registryId).toBe("model.clip");
    expect(page.frontmatter.status).toBe("published");
  });

  test("loads a published model page with populated modules and CLIP lead copy", async () => {
    const record = getModelById("model.clip");
    const page = await loadModelPage("clip");

    expect(record?.status).toBe("published");
    expect(record?.moduleIds).toEqual(
      expect.arrayContaining([
        "module.bidirectional-attention",
        "module.multi-head-attention",
        "module.learned-positional-embeddings",
        "module.clip-image-tokenization",
      ]),
    );
    expect(page.messages.openingSummary).toContain(
      "Contrastive Language-Image Pre-training (CLIP)",
    );
    expect(page.messages.openingSummary).toContain("pixels directly");
  });

  test("renders the architecture graph and canonical related glossary links without empty placeholders", async () => {
    const page = await loadModelPage("clip");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.clip-architecture"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/glossary/patch"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('id="important-modules"');
    expect(html).toContain("bidirectional attention");
    expect(html).not.toContain("No modules listed yet.");
    expect(html).not.toContain("No training regimes listed yet.");
    expect(html).not.toContain("No linked paper pages listed yet.");
  });
});
