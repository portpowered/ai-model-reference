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
import { loadRegistry } from "@/lib/content/registry";
import {
  loadTagResourceEntries,
  toTagResourceEntry,
} from "@/lib/content/tag-resources";
import { buildSearchDocuments } from "@/lib/search/build-documents";

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

  test("attention module URLs are derived from published resources instead of a hard-coded list", async () => {
    const moduleUrls = await loadPhase1AttentionModuleUrls("en");

    expect(moduleUrls).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL);
    expect(moduleUrls).toContain("/docs/modules/attention");
    expect(moduleUrls.length).toBeGreaterThanOrEqual(8);
  });
});
