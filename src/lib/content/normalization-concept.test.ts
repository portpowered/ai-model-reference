import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { CONCEPTS_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPageAssets } from "@/lib/content/page-assets-load";
import { loadPageMessages } from "@/lib/content/page-messages-load";
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
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.normalization";
const NORMALIZATION_CONCEPT_URL = "/docs/concepts/normalization";
const NORMALIZATION_GLOSSARY_URL = "/docs/glossary/normalization";
const LAYER_NORM_MODULE_URL = "/docs/modules/layer-norm";

const NORMALIZATION_CONCEPT_PAGE_DIR = join(
  CONCEPTS_DOCS_ROOT,
  "normalization",
);

const SHIPPED_NORMALIZATION_VARIANT_URLS = [
  "/docs/modules/layer-norm",
  "/docs/modules/rmsnorm",
  "/docs/modules/batch-norm",
  "/docs/modules/group-norm",
  "/docs/modules/qk-norm",
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

describe("Normalization concept page (normalization-concept-page-001)", () => {
  test("registry record stays published while the concept route is added", () => {
    const record = getConceptById("concept.normalization");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual(["normalization layer", "norm layer"]);
    expect(record?.tags).toEqual(["normalization", "foundations"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.normalization")).toBe(true);
  });

  test("page bundle teaches the broad normalization idea and hands off to variant pages", async () => {
    const page = await loadConceptPage("normalization");
    const mdxSource = readFileSync(
      join("src/content/docs/concepts/normalization", "page.mdx"),
      "utf8",
    );

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.registryId).toBe("concept.normalization");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "stable range",
    );
    expect(page.messages.sections?.whatItIs.body).toContain("rescaling");
    expect(page.messages.sections?.whyItMatters.body).toContain("training");
    expect(page.messages.sections?.whyItMatters.body).toContain("gradients");
    expect(page.messages.sections?.whyItMatters.body).toContain("optimization");
    expect(page.messages.sections?.whyItMatters.body).toContain(
      "predictable range",
    );
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "Layer normalization",
    );
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "RMSNorm",
    );
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "Batch normalization",
    );
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "Group normalization",
    );
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "Query-key normalization",
    );
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "where that rescaling sits",
    );
    expect(page.toc.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "What It Is",
        "Why It Matters",
        "Simple Example",
        "When To Open A Variant Page",
      ]),
    );
    expect(mdxSource).toContain('href="/docs/modules/layer-norm"');
    expect(mdxSource).toContain('href="/docs/modules/rmsnorm"');
    expect(mdxSource).toContain('href="/docs/modules/batch-norm"');
    expect(mdxSource).toContain('href="/docs/modules/group-norm"');
    expect(mdxSource).toContain('href="/docs/modules/qk-norm"');
    expect(mdxSource).not.toContain("Reader Shortcut");
    expect(mdxSource).not.toContain("benchmark leaderboard");
  });

  test("rendered concept page keeps the normalization family navigable from the broad explainer", async () => {
    const page = await loadConceptPage("normalization");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/modules/layer-norm"');
    expect(html).toContain('href="/docs/modules/rmsnorm"');
    expect(html).toContain('href="/docs/modules/batch-norm"');
    expect(html).toContain('href="/docs/modules/group-norm"');
    expect(html).toContain('href="/docs/modules/qk-norm"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/glossary/residual-connection"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Draft placeholder");
  });

  test("published docs and search documents include the normalization concept route", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");

    expect(
      pages.some((page) => page.url === "/docs/concepts/normalization"),
    ).toBe(true);

    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === "/docs/concepts/normalization",
    );

    expect(document?.kind).toBe("concept");
    expect(document?.facets.kind).toBe("concept");
    expect(document?.registryId).toBe("concept.normalization");
    expect(document?.tags).toEqual(
      expect.arrayContaining(["normalization", "foundations"]),
    );
    expect(document?.bodyText).toContain("Layer norm");
    expect(document?.bodyText).toContain("RMSNorm");
  });

  test("message and asset bundles load cleanly for the published normalization concept route", async () => {
    const page = await loadConceptPage("normalization");
    const messages = await loadPageMessages(
      NORMALIZATION_CONCEPT_PAGE_DIR,
      "en",
    );
    const assets = await loadPageAssets(NORMALIZATION_CONCEPT_PAGE_DIR);

    expect(messages.title).toBe("Normalization");
    expect(messages.description).not.toContain("Draft placeholder");
    expect(messages.openingSummary).toBe(page.messages.openingSummary);
    expect(messages.sections?.whyItMatters.body).toContain("stable");
    expect(page.messages.title).toBe(messages.title);
    expect(page.messages.description).toBe(messages.description);
    expect(Object.keys(assets)).toEqual([]);
    expect(page.assets).toEqual(assets);
  });
});

describe("Normalization concept page (normalization-concept-page-003)", () => {
  test("registry aliases stay on the canonical concept record without duplicate concept data", () => {
    const record = getConceptById(REGISTRY_ID);

    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(["normalization layer", "norm layer"]);
    expect(record?.explainsIds).toEqual([
      "concept.layer-norm",
      "concept.rmsnorm",
      "concept.batch-norm",
      "concept.group-norm",
      "concept.qk-norm",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("published docs entry prefers the concepts route over the glossary bundle", () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);

    expect(entry?.url).toBe(NORMALIZATION_CONCEPT_URL);
    expect(entry?.section).toBe("concepts");
    expect(entry?.pageKind).toBe("concept");
  });

  test("search documents carry normalization discovery aliases on the canonical concept page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === NORMALIZATION_CONCEPT_URL,
    );

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.kind).toBe("concept");
    expect(document?.directAliases).toEqual(
      expect.arrayContaining(["normalization layer", "norm layer"]),
    );
  });

  test.each([
    "normalization",
    "normalization layer",
    "norm layer",
  ] as const)("live search routes %s to the canonical normalization concept page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(NORMALIZATION_CONCEPT_URL);
    expect(pageBaseUrlFromResults(results, NORMALIZATION_CONCEPT_URL)).toBe(
      true,
    );
  });

  test("normalization search surfaces the broad concept together with shipped variant and glossary paths", async () => {
    const results = await docsSearchApi.search("normalization");

    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(NORMALIZATION_CONCEPT_URL);
    expect(pageBaseUrlFromResults(results, LAYER_NORM_MODULE_URL)).toBe(true);
    expect(pageBaseUrlFromResults(results, NORMALIZATION_GLOSSARY_URL)).toBe(
      true,
    );
  });

  for (const variantUrl of SHIPPED_NORMALIZATION_VARIANT_URLS) {
    test(`variant page ${variantUrl} related docs resolve the canonical normalization concept route`, () => {
      const slug = variantUrl.replace("/docs/modules/", "");
      const registryId = `concept.${slug}` as const;
      const source = getConceptById(registryId);
      if (!source) {
        throw new Error(`expected ${registryId} in registry`);
      }

      const items = deriveCuratedRelatedItems(
        source,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      const normalization = items.find(
        (item) => item.registryId === REGISTRY_ID,
      );
      expect(normalization?.href).toBe(NORMALIZATION_CONCEPT_URL);
      expect(normalization?.isPlanned).toBe(false);
    });
  }
});
