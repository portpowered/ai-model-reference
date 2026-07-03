/**
 * Consolidated review-facing slice proof for the text-to-image conditioning concept page.
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
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.text-to-image-conditioning";
const PAGE_URL = "/docs/concepts/text-to-image-conditioning";
const pageDir = getDocsPageDir("concepts", "text-to-image-conditioning");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const DISCOVERY_HREFS = [
  "/docs/glossary/conditioning",
  "/docs/concepts/classifier-free-guidance",
  "/docs/glossary/denoising-generation",
  "/docs/glossary/diffusion-model",
  "/docs/concepts/latent-space",
  "/docs/models/clip",
  "/docs/papers/latent-diffusion",
] as const;

async function renderConditioningPageHtml(): Promise<string> {
  const page = await loadConceptPage("text-to-image-conditioning");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("text-to-image conditioning slice verification (text-to-image-conditioning-concept-page-005)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "text-to-image-conditioning",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("text-to-image-conditioning");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets.conceptMap.graphId).toBe(
      "graph.text-to-image-conditioning-generation-flow",
    );
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "text-to-image-conditioning",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Text-to-image conditioning");

    const rendered = await renderDocsSlugPage(
      ["concepts", "text-to-image-conditioning"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes sections, concept map, tags, related links, citations, and search aliases", async () => {
    const html = await renderConditioningPageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error(
        "expected concept.text-to-image-conditioning in registry",
      );
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Simple Example");
    expect(html).toContain("Where It Appears");
    expect(html).toContain("Common Confusions");
    expect(html).toContain('data-page-asset="conceptMap"');
    expect(html).toContain(
      'data-graph-id="graph.text-to-image-conditioning-generation-flow"',
    );
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/taxonomy"');
    expect(html).toContain('href="/tags/model-family"');
    for (const href of DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing content");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(related.length).toBeGreaterThan(0);

    for (const query of [
      "text-to-image conditioning",
      "text conditioning",
      "prompt conditioning",
      "text prompt steering",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
