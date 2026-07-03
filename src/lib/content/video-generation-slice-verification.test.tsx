/**
 * Consolidated review-facing slice proof for the video generation concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and related-link behavior together.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.video-generation";
const GENERATION_PATHS_GRAPH_ID = "graph.video-generation-paths";
const PAGE_URL = "/docs/concepts/video-generation";

async function renderVideoGenerationPageHtml(): Promise<string> {
  const page = await loadConceptPage("video-generation");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("video generation slice verification (video-generation-concept-page-005)", () => {
  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "video-generation",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Video generation");

    const rendered = await renderDocsSlugPage(
      ["concepts", "video-generation"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes title, explanations, graph title and legend, tags, related docs, and references", async () => {
    const html = await renderVideoGenerationPageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.video-generation in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html.toLowerCase()).toContain("video generation");
    expect(html.toLowerCase()).toContain("temporal consistency");
    expect(html.toLowerCase()).toContain("frame-level generation");
    expect(html.toLowerCase()).toContain("visual-token generation");
    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/models/ltx-23"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain(`data-graph-id="${GENERATION_PATHS_GRAPH_ID}"`);
    expect(html).toContain(`data-graph-title="${GENERATION_PATHS_GRAPH_ID}"`);
    expect(html).toContain("Frame-level and visual-token generation paths");
    expect(html).toContain(`data-graph-legend="${GENERATION_PATHS_GRAPH_ID}"`);
    expect(html).toContain("Generation path over time");
    expect(html).toContain("Output shape or time axis");
    expect(html).toContain("Consistency or mechanism detail");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(related.length).toBeGreaterThan(0);
  });

  test("live search routes video generation discovery aliases to the canonical concept page", async () => {
    for (const query of [
      "video generation",
      "temporal consistency",
      "text to video",
      "visual token generation",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
