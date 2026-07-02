import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.normalization";
const SLUG = "normalization";
const PAGE_URL = "/docs/concepts/normalization";
const LAYER_NORM_MODULE_URL = "/docs/modules/layer-norm";

const pageDir = getDocsPageDir("concepts", SLUG);
const messagesPath = join(pageDir, "messages/en.json");

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

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on search, discovery, variant handoffs, and rendered
 * surface contracts specific to the normalization concept slice.
 */
describe("normalization concept slice verification (normalization-concept-page-004)", () => {
  test("canonical route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadConceptPage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getConceptById(REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
      section: "concepts",
    });
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "stable range",
    );
    expect(Object.keys(page.assets)).toEqual([]);
  });

  test("discovery metadata and live search resolve the canonical page for normalization aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.kind).toBe("concept");
    expect(document?.directAliases).toEqual(
      expect.arrayContaining(["normalization layer", "norm layer"]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["normalization", "foundations"]),
    );

    const results = await docsSearchApi.search("normalization");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
    expect(pageBaseUrlFromResults(results, LAYER_NORM_MODULE_URL)).toBe(true);
  });

  test("layer norm variant related docs resolve the broad normalization concept route", () => {
    const source = getConceptById("concept.layer-norm");
    if (!source) {
      throw new Error("expected concept.layer-norm in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const normalization = items.find((item) => item.registryId === REGISTRY_ID);
    expect(normalization?.href).toBe(PAGE_URL);
    expect(normalization?.isPlanned).toBe(false);
  });

  test("rendered concept page exposes variant handoffs, tags, and related docs without placeholder copy", async () => {
    const page = await loadConceptPage(SLUG);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain('href="/docs/modules/layer-norm"');
    expect(html).toContain('href="/docs/modules/rmsnorm"');
    expect(html).toContain('href="/docs/modules/batch-norm"');
    expect(html).toContain('href="/docs/modules/group-norm"');
    expect(html).toContain('href="/docs/modules/qk-norm"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });
});
