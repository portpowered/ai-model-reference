/**
 * Consolidated review-facing slice proof for the classifier-free guidance concept page.
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

const REGISTRY_ID = "concept.classifier-free-guidance";
const PAGE_URL = "/docs/concepts/classifier-free-guidance";
const GUIDANCE_BLEND_GRAPH_ID = "graph.classifier-free-guidance-blend";
const pageDir = getDocsPageDir("concepts", "classifier-free-guidance");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderGuidancePageHtml(): Promise<string> {
  const page = await loadConceptPage("classifier-free-guidance");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("classifier-free guidance slice verification (classifier-free-guidance-concept-page-004)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "classifier-free-guidance",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const graph = getGraphById(GUIDANCE_BLEND_GRAPH_ID);

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("classifier-free-guidance");
    expect(record?.citationIds).toEqual([
      "citation.classifier-free-diffusion-guidance",
    ]);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(validatePageAssetReferences(bundledAssets, bundledMessages)).toEqual(
      [],
    );
    expect(graph?.status).toBe("published");
    expect(graph?.subjectId).toBe(REGISTRY_ID);
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "classifier-free-guidance",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Classifier-Free Guidance");

    const rendered = await renderDocsSlugPage(
      ["concepts", "classifier-free-guidance"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes diffusion foundations, teaching assets, tags, and search aliases", async () => {
    const html = await renderGuidancePageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.classifier-free-guidance in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html.toLowerCase()).toContain("classifier-free guidance");
    expect(html).toContain("conditional prediction");
    expect(html).toContain("Guidance Scale");
    expect(html).toContain("Tradeoffs");
    expect(html).toContain('data-page-math-formula="guidedPrediction"');
    expect(html).toContain('data-page-asset="guidanceBlendMap"');
    expect(html).toContain(`data-graph-id="${GUIDANCE_BLEND_GRAPH_ID}"`);
    expect(html).toContain("Guidance direction");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/models/clip"');
    expect(html).toContain('href="/docs/papers/latent-diffusion"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/taxonomy"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(related.length).toBeGreaterThan(0);

    for (const query of [
      "Classifier-Free Guidance",
      "CFG",
      "guidance scale",
      "unconditional prediction",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
