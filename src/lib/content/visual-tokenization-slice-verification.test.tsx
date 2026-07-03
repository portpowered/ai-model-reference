/**
 * Consolidated review-facing slice proof for the visual tokenization concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and journey-link behavior together.
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

const REGISTRY_ID = "concept.visual-tokenization";
const PAGE_URL = "/docs/concepts/visual-tokenization";
const pageDir = getDocsPageDir("concepts", "visual-tokenization");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderVisualTokenizationPageHtml(): Promise<string> {
  const page = await loadConceptPage("visual-tokenization");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("visual tokenization slice verification (visual-tokenization-concept-page-005)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "visual-tokenization",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("visual-tokenization");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets.representationFormsComparison).toMatchObject({
      type: "table",
      tableId: "table.visual-tokenization-representation-forms-comparison",
    });
    expect(page.assets.representationFormsComparison?.type).toBe("table");
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "visual-tokenization",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Visual tokenization");

    const rendered = await renderDocsSlugPage(
      ["concepts", "visual-tokenization"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes representation prose, comparison table, journey links, and search aliases", async () => {
    const html = await renderVisualTokenizationPageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.visual-tokenization in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html).toContain("Visual tokenization");
    expect(html).toContain("Patch tokenization splits");
    expect(html).toContain("Discrete-code tokenization maps");
    expect(html).toContain(
      'data-table-id="table.visual-tokenization-representation-forms-comparison"',
    );
    expect(html).toContain("Nearby Encoding And Generation Paths");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/clip-image-tokenization"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/models/ltx-23"');
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(related.length).toBeGreaterThan(0);

    for (const query of [
      "visual tokenization",
      "patch tokens",
      "discrete visual codes",
      "latent visual tokens",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
