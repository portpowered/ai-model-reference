/**
 * Consolidated review-facing slice proof for the synthetic data concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and training-workflow related-link behavior together.
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
import { resolveCitations } from "@/lib/content/citations";
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
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.synthetic-data";
const PAGE_URL = "/docs/concepts/synthetic-data";
const TRAINING_WORKFLOW_HREFS = [
  "/docs/training/distillation",
  "/docs/training/on-policy-distillation",
  "/docs/training/post-training",
  "/docs/training/rlhf",
  "/docs/training/rlvr",
] as const;
const DISCOVERY_ALIAS_QUERIES = [
  "synthetic data",
  "generated data",
  "model-generated data",
  "synthetic labels",
  "synthetic traces",
  "preference data",
] as const;

const pageDir = getDocsPageDir("concepts", "synthetic-data");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

async function renderSyntheticDataPageHtml(): Promise<string> {
  const page = await loadConceptPage("synthetic-data");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("synthetic data slice verification (synthetic-data-concept-page-003)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "synthetic-data",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("synthetic-data");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([...DISCOVERY_ALIAS_QUERIES]),
    );
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets).toEqual({});
  });

  test("registry citation references resolve for the synthetic data bundle", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.synthetic-data in registry");
    }

    const citations = resolveCitations(record.citationIds);
    expect(citations.length).toBeGreaterThan(0);
    for (const citation of citations) {
      expect(citation.url.length).toBeGreaterThan(0);
    }
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "synthetic-data",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Synthetic Data");

    const rendered = await renderDocsSlugPage(
      ["concepts", "synthetic-data"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("live search resolves synthetic-data discovery aliases to the canonical page", async () => {
    for (const query of DISCOVERY_ALIAS_QUERIES) {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
    }
  });

  test("curated related items connect synthetic data to published training workflows", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.synthetic-data in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    const hrefs = relatedItems.map((item) => item.href);

    for (const href of TRAINING_WORKFLOW_HREFS) {
      expect(hrefs).toContain(href);
    }
    expect(hrefs).toContain("/docs/concepts/alignment");
  });

  test("rendered page exposes sections, tags, citations, and training-workflow related links", async () => {
    const html = await renderSyntheticDataPageHtml();

    expect(html).toContain("What It Is");
    expect(html).toContain("Common Forms");
    expect(html).toContain("Compared To Other Data Sources");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="curated-related"');
    expect(html).toContain('data-testid="citation-list"');
    for (const href of TRAINING_WORKFLOW_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
  });
});
