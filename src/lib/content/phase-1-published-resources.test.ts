import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  loadPhase1AttentionModuleUrls,
  loadPublishedResourcesForTag,
  PHASE_1_ATTENTION_TAG_SLUG,
  PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL,
  publishedResourceMatchesTag,
  resolvePublishedResourceTags,
} from "@/lib/content/phase-1-published-resources";
import { REPRESENTATIVE_DISCOVERY_CONTRACTS } from "@/lib/content/phase-2-3-reconciliation-convergence";
import { loadRegistry } from "@/lib/content/registry";
import {
  loadTagResourceEntries,
  loadTagResourceGroups,
  toTagResourceEntry,
} from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

function docsSlugFromUrl(url: string): string[] {
  return url.replace("/docs/", "").split("/");
}

describe("Phase 1 published-resource discovery contract", () => {
  test("grouped-query-attention resolves as an attention resource from registry and frontmatter tags", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();
    const gqaPage = pages.find(
      (page) => page.url === PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL,
    );

    expect(gqaPage).toBeDefined();
    if (!gqaPage) {
      throw new Error("expected grouped-query-attention published page");
    }
    expect(gqaPage.frontmatter.status).toBe("published");
    expect(gqaPage.frontmatter.tags).toContain(PHASE_1_ATTENTION_TAG_SLUG);

    const tags = resolvePublishedResourceTags(gqaPage, indexes);
    expect(tags).toContain(PHASE_1_ATTENTION_TAG_SLUG);
    expect(
      publishedResourceMatchesTag(gqaPage, PHASE_1_ATTENTION_TAG_SLUG, indexes),
    ).toBe(true);
  });

  test("tag landing and canonical loader agree on attention-tagged published resources", async () => {
    const indexes = await loadRegistry();
    const canonicalPages = await loadPublishedResourcesForTag(
      PHASE_1_ATTENTION_TAG_SLUG,
      "en",
    );
    const tagEntries = await loadTagResourceEntries(
      PHASE_1_ATTENTION_TAG_SLUG,
      "en",
    );

    expect(canonicalPages.map((page) => page.url).sort()).toEqual(
      tagEntries.map((entry) => entry.url).sort(),
    );

    for (const page of canonicalPages) {
      expect(
        publishedResourceMatchesTag(page, PHASE_1_ATTENTION_TAG_SLUG, indexes),
      ).toBe(true);
      expect(tagEntries).toContainEqual(toTagResourceEntry(page));
    }
  });

  test("search documents derive attention tags from the same published-resource rule", async () => {
    const indexes = await loadRegistry();
    const canonicalPages = await loadPublishedResourcesForTag(
      PHASE_1_ATTENTION_TAG_SLUG,
      "en",
    );
    const documents = buildSearchDocuments(canonicalPages, indexes);
    const gqaDocument = documents.find(
      (document) => document.url === PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL,
    );

    expect(gqaDocument).toBeDefined();
    expect(gqaDocument?.tags).toContain(PHASE_1_ATTENTION_TAG_SLUG);
  });

  test("attention module URLs are derived from published resources and stay module-scoped", async () => {
    const indexes = await loadRegistry();
    const moduleUrls = await loadPhase1AttentionModuleUrls("en");
    const pages = await loadPublishedDocsPages("en");
    const pageByUrl = new Map(pages.map((page) => [page.url, page]));

    expect(moduleUrls).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL);
    expect(moduleUrls).toContain("/docs/modules/attention");

    for (const url of moduleUrls) {
      const page = pageByUrl.get(url);
      expect(
        page?.frontmatter.kind,
        `${url} should resolve as a module from published-resource discovery`,
      ).toBe("module");
      expect(
        publishedResourceMatchesTag(page!, PHASE_1_ATTENTION_TAG_SLUG, indexes),
        `${url} should match the attention discovery tag`,
      ).toBe(true);
    }
  });

  test(
    "representative discovery contracts stay aligned across source, tag landing, and search",
    async () => {
      const indexes = await loadRegistry();
      const messages = await loadUiMessages();
      const pages = await loadPublishedDocsPages("en");
      const pageByUrl = new Map(pages.map((page) => [page.url, page]));
      const documents = buildSearchDocuments(pages, indexes);
      const documentByUrl = new Map(
        documents.map((document) => [document.url, document]),
      );

      for (const contract of REPRESENTATIVE_DISCOVERY_CONTRACTS) {
        const page = pageByUrl.get(contract.pageUrl);
        expect(
          page,
          `missing published page for representative route ${contract.pageUrl}`,
        ).toBeDefined();
        expect(
          source.getPage(docsSlugFromUrl(contract.pageUrl)),
          `source should resolve ${contract.pageUrl}`,
        ).toBeDefined();

        const document = documentByUrl.get(contract.pageUrl);
        expect(
          document?.kind,
          `search document kind for ${contract.pageUrl}`,
        ).toBe(contract.expectedKind);

        for (const tagSlug of contract.requiredTagSlugs) {
          expect(
            publishedResourceMatchesTag(page!, tagSlug, indexes),
            `${contract.pageUrl} should match tag ${tagSlug}`,
          ).toBe(true);

          const groups = await loadTagResourceGroups(tagSlug, messages, "en");
          const group = groups.find(
            (entry) => entry.kind === contract.expectedKind,
          );
          expect(
            group?.resources.some((entry) => entry.url === contract.pageUrl),
            `/tags/${tagSlug} should list ${contract.pageUrl}`,
          ).toBe(true);
        }

        for (const query of contract.representativeQueries) {
          const results = await docsSearchApi.search(query);
          expect(
            pageBaseUrl(results[0]?.url ?? ""),
            `query "${query}" should rank ${contract.pageUrl} first`,
          ).toBe(contract.pageUrl);
        }
      }
    },
    { timeout: 30_000 },
  );

  test("non-default locale tag discovery only includes shipped localized resources", async () => {
    const canonicalPages = await loadPublishedResourcesForTag(
      PHASE_1_ATTENTION_TAG_SLUG,
      "vi",
    );
    const tagEntries = await loadTagResourceEntries(
      PHASE_1_ATTENTION_TAG_SLUG,
      "vi",
    );

    expect(canonicalPages.map((page) => page.url).sort()).toEqual(
      tagEntries.map((entry) => entry.url).sort(),
    );
    expect(canonicalPages.map((page) => page.url)).toContain(
      "/vi/docs/modules/grouped-query-attention",
    );
    expect(canonicalPages.map((page) => page.url)).not.toContain(
      "/vi/docs/modules/sparse-attention",
    );
  });
});
