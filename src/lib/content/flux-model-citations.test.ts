/**
 * Retained per derived-page-validation policy: Flux primary-source citation
 * resolution and references rendering cannot be expressed as derived bundle
 * invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { loadModelPage } from "@/lib/content/model-page";
import { getModelById } from "@/lib/content/registry-runtime";

const MODEL_ID = "model.flux";

const PRIMARY_SOURCE_CITATION_URLS = [
  "https://bfl.ai/blog/24-08-01-bfl",
  "https://github.com/black-forest-labs/flux",
  "https://huggingface.co/black-forest-labs/FLUX.1-dev",
  "https://github.com/black-forest-labs/flux2",
] as const;

describe("flux model citations", () => {
  test("resolves four primary BFL and open-weight source citations in registry order", () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.flux in registry");
    }

    expect(model.citationIds).toEqual([
      "citation.flux-bfl-announcement",
      "citation.flux-github-repository",
      "citation.flux-1-dev-huggingface",
      "citation.flux-2-github-repository",
    ]);

    const citations = resolveCitations(model.citationIds);
    expect(citations.map((citation) => citation.url)).toEqual([
      ...PRIMARY_SOURCE_CITATION_URLS,
    ]);
    expect(citations.every((citation) => citation.mla.length > 0)).toBe(true);
    expect(citations.every((citation) => citation.authors.length > 0)).toBe(
      true,
    );
    expect(new Set(citations.map((citation) => citation.url)).size).toBe(
      PRIMARY_SOURCE_CITATION_URLS.length,
    );
  });

  test("renders the references section with resolvable primary-source links", async () => {
    const page = await loadModelPage("flux");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('id="references"');
    expect(html).toContain('data-testid="citation-list"');
    for (const url of PRIMARY_SOURCE_CITATION_URLS) {
      expect(html).toContain(`href="${url}"`);
    }
  });

  test("keeps page copy free of unsupported parameter-count or benchmark claims", async () => {
    const page = await loadModelPage("flux");
    const prose = JSON.stringify(page.messages);

    expect(prose).not.toMatch(/\b\d+(\.\d+)?\s*billion\b/i);
    expect(prose).not.toMatch(/\b\d+B\b/);
    expect(prose).not.toMatch(/benchmark/i);
    expect(prose).toContain("rectified flow");
    expect(prose).toContain("non-commercial license");
  });
});
