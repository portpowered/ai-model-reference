import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { loadConceptPage } from "@/lib/content/concept-page";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.relative-position-bias";
const SLUG = "relative-position-bias";
const PAGE_URL = "/docs/concepts/relative-position-bias";
const SHAW_CITATION_ID =
  "citation.self-attention-with-relative-position-representations";
const POSITIONAL_ENCODINGS_URL = "/docs/concepts/positional-encodings";
const T5_BIAS_MODULE_URL = "/docs/modules/t5-relative-position-bias";

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
 * These tests stay focused on search, discovery, positional-family handoffs,
 * citation resolution, and rendered surface contracts specific to the relative
 * position bias concept slice.
 */
describe("relative position bias concept slice verification (relative-position-bias-concept-page-004)", () => {
  test("canonical route resolves to the published registry record and default English messages", async () => {
    const route = localDocsRoute({ section: "concepts", slug: SLUG });
    const bundle = await loadLocalDocsPage({
      section: "concepts",
      slug: SLUG,
    });
    const page = await loadConceptPage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(bundle.messages);
    const record = getConceptById(REGISTRY_ID);

    expect(route).toBe(PAGE_URL);
    expect(bundle.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(bundle.frontmatter.kind).toBe("concept");
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "distance-aware",
    );
    expect(Object.keys(page.assets)).toEqual([]);
  });

  test("registry citation references resolve for the relative position bias bundle", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.relative-position-bias in registry");
    }

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(SHAW_CITATION_ID);
    expect(citations[0]?.url).toContain("arxiv.org");
  });

  test("discovery metadata and live search resolve the canonical page for representative aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "relative position bias",
        "relative positional bias",
        "relative attention bias",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["position-encoding", "foundations"]),
    );

    const results = await docsSearchApi.search("relative position bias");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
    expect(pageBaseUrlFromResults(results, T5_BIAS_MODULE_URL)).toBe(true);
  });

  test.each([
    "relative position bias",
    "relative positional bias",
    "relative attention bias",
  ] as const)("live search routes %s to the canonical relative position bias concept page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("curated related links resolve positional encodings and module-backed family pages", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.relative-position-bias in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const positionalEncodings = items.find(
      (item) => item.registryId === "concept.positional-encodings",
    );
    expect(positionalEncodings?.href).toBe(POSITIONAL_ENCODINGS_URL);
    expect(positionalEncodings?.isPlanned).toBe(false);

    const t5Bias = items.find(
      (item) => item.registryId === "concept.t5-relative-position-bias",
    );
    expect(t5Bias?.href).toBe(T5_BIAS_MODULE_URL);
    expect(t5Bias?.isPlanned).toBe(false);
  });

  test("T5 relative position bias variant related docs resolve the broad concept route", () => {
    const source = getConceptById("concept.t5-relative-position-bias");
    if (!source) {
      throw new Error("expected concept.t5-relative-position-bias in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const umbrella = items.find((item) => item.registryId === REGISTRY_ID);
    expect(umbrella?.href).toBe(PAGE_URL);
    expect(umbrella?.isPlanned).toBe(false);
  });

  test("position-encoding tag landing exposes the canonical relative position bias concept route", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      "position-encoding",
      messages,
      "en",
    );
    const conceptGroup = groups.find((group) => group.kind === "concept");

    expect(
      conceptGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);

    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "position-encoding" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain(`href="${PAGE_URL}"`);
  });

  test("rendered concept page exposes family handoffs, tags, citations, and related docs", async () => {
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
    expect(html).toContain(`href="${POSITIONAL_ENCODINGS_URL}"`);
    expect(html).toContain(`href="${T5_BIAS_MODULE_URL}"`);
    expect(html).toContain('href="/docs/modules/rope"');
    expect(html).toContain('href="/docs/modules/alibi"');
    expect(html).toContain(
      'href="/docs/modules/absolute-positional-embeddings"',
    );
    expect(html).toContain('href="/tags/position-encoding"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("Shaw, Peter");
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
    expect(html).not.toContain("Draft placeholder");
  });
});
