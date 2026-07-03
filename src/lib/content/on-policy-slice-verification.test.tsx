/**
 * Consolidated review-facing slice proof for the on-policy training concept page.
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
import { resolveCitations } from "@/lib/content/citations";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
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

const REGISTRY_ID = "concept.on-policy";
const SLUG = "on-policy";
const PAGE_URL = "/docs/concepts/on-policy";

const pageDir = getDocsPageDir("concepts", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const DISCOVERY_QUERIES = [
  "on-policy",
  "on-policy training",
  "current policy",
  "current-policy data",
  "off-policy",
] as const;

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

async function renderOnPolicyPageHtml(): Promise<string> {
  const page = await loadConceptPage(SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("on-policy concept slice verification (on-policy-concept-page-004)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: SLUG,
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
      section: "concepts",
    });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe(SLUG);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "on-policy",
        "on-policy training",
        "current policy",
        "current-policy data",
      ]),
    );
    expect(record?.tags).toEqual(
      expect.arrayContaining(["foundations", "alignment"]),
    );
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.alignment",
        "training-regime.rlhf",
        "training-regime.rlvr",
        "training-regime.on-policy-distillation",
        "training-regime.distillation",
      ]),
    );
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets).toEqual({});
  });

  test("registry citation references resolve for the on-policy bundle", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.on-policy in registry");
    }

    const citations = resolveCitations(record.citationIds);
    expect(citations.length).toBeGreaterThan(0);
    expect(citations.every((citation) => citation.url.length > 0)).toBe(true);
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["concepts", SLUG]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("On-policy training");

    const rendered = await renderDocsSlugPage(["concepts", SLUG], "en");
    expect(rendered).toBeDefined();
  });

  test("search document and live search resolve the canonical page for discovery queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.directAliases).toEqual(
      expect.arrayContaining([
        "on-policy",
        "on-policy training",
        "current policy",
        "current-policy data",
      ]),
    );
    expect(document?.bodyText?.toLowerCase()).toContain("off-policy");

    for (const query of DISCOVERY_QUERIES) {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
    }
  });

  test("foundations and alignment tag landings expose the canonical on-policy concept route", async () => {
    const messages = await loadUiMessages();

    for (const tag of ["foundations", "alignment"] as const) {
      const groups = await loadTagResourceGroups(tag, messages, "en");
      const conceptGroup = groups.find((group) => group.kind === "concept");

      expect(
        conceptGroup?.resources.some((resource) => resource.url === PAGE_URL),
      ).toBe(true);
    }
  });

  test("nearby training regimes keep separate reader paths through curated related metadata", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.on-policy in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(relatedItems.length).toBeGreaterThan(0);

    const relatedHrefs = relatedItems.map((item) => item.href);
    expect(relatedHrefs).toContain("/docs/training/rlhf");
    expect(relatedHrefs).toContain("/docs/training/rlvr");
    expect(relatedHrefs).toContain("/docs/training/on-policy-distillation");
    expect(relatedHrefs).toContain("/docs/concepts/alignment");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.rlhf")).toBe(true);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.rlvr")).toBe(true);
  });

  test("rendered page exposes comparison prose, nearby-regime links, tags, and related docs", async () => {
    const html = await renderOnPolicyPageHtml();

    expect(html.toLowerCase()).toContain("on-policy training");
    expect(html).toContain("Current-policy data versus static examples");
    expect(html.toLowerCase()).toContain("train/deploy mismatch");
    expect(html).toContain("Nearby Training Regimes");
    expect(html).toContain('href="/docs/training/rlhf"');
    expect(html).toContain('href="/docs/training/rlvr"');
    expect(html).toContain('href="/docs/training/on-policy-distillation"');
    expect(html).toContain('href="/docs/training/distillation"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
  });
});
