/**
 * Consolidated review-facing slice proof for the feed-forward network concept page.
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
import {
  getPublishedDocsEntriesBySlug,
  getPublishedDocsEntryByRegistryId,
  getPublishedDocsHrefForRecord,
  hasPublishedDocsPageForRecord,
  MODULE_BACKED_CONCEPT_REGISTRY_IDS,
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { registryRecordHref } from "@/lib/content/registry-linking";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.feed-forward-network";
const PAGE_URL = "/docs/concepts/feed-forward-network";
const pageDir = getDocsPageDir("concepts", "feed-forward-network");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderFeedForwardNetworkPageHtml(): Promise<string> {
  const page = await loadConceptPage("feed-forward-network");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("feed-forward network slice verification (feed-forward-network-concept-page-current-main-005)", () => {
  test("published concept-section routing resolves ahead of the module-backed slug", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.feed-forward-network in registry");
    }

    const publishedConceptEntry =
      getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const publishedModuleEntry = getPublishedDocsEntryByRegistryId(
      "module.feed-forward-network",
    );

    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(hasPublishedDocsPageForRecord(record)).toBe(true);
    expect(getPublishedDocsEntryByRegistryId(REGISTRY_ID)).toEqual(
      publishedConceptEntry,
    );
    expect(getPublishedDocsEntriesBySlug(record.slug)).toEqual(
      expect.arrayContaining([publishedConceptEntry, publishedModuleEntry]),
    );
    expect(MODULE_BACKED_CONCEPT_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(getPublishedDocsHrefForRecord(record)).toBe(PAGE_URL);
    expect(registryRecordHref(record)).toBe(PAGE_URL);
  });

  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "feed-forward-network",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("feed-forward-network");
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.standard-ffn",
      "concept.mixture-of-experts",
      "concept.swiglu",
      "concept.relu",
      "concept.silu",
    ]);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets).toEqual({});
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "feed-forward-network",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Feed-Forward Network");

    const rendered = await renderDocsSlugPage(
      ["concepts", "feed-forward-network"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes token-wise teaching, variant links, tags, and search aliases", async () => {
    const html = await renderFeedForwardNetworkPageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.feed-forward-network in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html.toLowerCase()).toContain("feed-forward network");
    expect(html).toContain("token-wise");
    expect(html).toContain("Dense And Sparse Variants");
    expect(html.toLowerCase()).toContain("standard feed-forward network");
    expect(html.toLowerCase()).toContain("mixture of experts");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/concepts/mixture-of-experts"');
    expect(html).toContain('href="/docs/modules/swiglu"');
    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).toContain('href="/docs/modules/silu"');
    expect(html).toContain('href="/tags/feed-forward"');
    expect(html).toContain('data-prose-auto-link="true"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(html).not.toContain("missing-content");
    expect(related.length).toBeGreaterThan(0);

    for (const query of [
      "Feed-Forward Network",
      "FFN",
      "MLP block",
      "feedforward network",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
