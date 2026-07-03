/**
 * Consolidated review-facing slice proof for the video generation concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and related-link behavior together.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.video-generation";
const GENERATION_PATHS_GRAPH_ID = "graph.video-generation-paths";
const PAGE_URL = "/docs/concepts/video-generation";
const pageDir = getDocsPageDir("concepts", "video-generation");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

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
  test("published route, registry record, bundled messages, and graph assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "video-generation",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("video-generation");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(validatePageAssetReferences(bundledAssets, bundledMessages)).toEqual(
      [],
    );
    expect(getGraphById(GENERATION_PATHS_GRAPH_ID)?.subjectId).toBe(
      REGISTRY_ID,
    );
  });

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

  test("rendered page exposes title, explanations, tags, related docs, references, and graph wiring", async () => {
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
    expect(html).toContain('data-graph-id="graph.video-generation-paths"');
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
