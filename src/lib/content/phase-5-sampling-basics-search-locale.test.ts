import { describe, expect, test } from "bun:test";
import { buildDocsPageMetadata } from "@/app/docs/docs-slug-renderer";
import {
  loadPublishedDocsPages,
  loadShippedLocalizedDocsPages,
} from "@/lib/content/pages";
import { getConceptById } from "@/lib/content/registry-runtime";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";

const PHASE_5_SAMPLING_DOCS = [
  {
    docsSlug: "glossary/sampling-overview",
    url: "/docs/glossary/sampling-overview",
    query: "token sampling",
  },
  {
    docsSlug: "glossary/greedy-decoding",
    url: "/docs/glossary/greedy-decoding",
    query: "argmax decoding",
  },
  {
    docsSlug: "glossary/top-k-sampling",
    url: "/docs/glossary/top-k-sampling",
    query: "fixed-count sampling",
  },
  {
    docsSlug: "glossary/top-p-sampling",
    url: "/docs/glossary/top-p-sampling",
    query: "nucleus sampling",
  },
] as const;

describe("Phase 5 sampling-basics search and locale stability (phase-5-sampling-basics-decision-path-005)", () => {
  test("published English docs and search surfaces include the four-page sampling slice", async () => {
    const pages = await loadPublishedDocsPages("en");
    const docsSlugs = pages.map((page) => page.docsSlug);
    const meta = await loadSearchResultMetaMap("en");

    for (const page of PHASE_5_SAMPLING_DOCS) {
      expect(docsSlugs).toContain(page.docsSlug);
      expect(meta.get(page.url)?.title).toBeDefined();

      const results = await docsSearchApi.search(page.query);
      expect(results.some((result) => result.url === page.url)).toBe(true);
    }
  });

  test("temperature foundations and the four-page chain expose a traversable sampling path", () => {
    expect(getConceptById("concept.temperature")?.relatedIds).toContain(
      "concept.sampling-overview",
    );
    expect(getConceptById("concept.softmax")?.relatedIds).toContain(
      "concept.sampling-overview",
    );
    expect(getConceptById("concept.entropy")?.relatedIds).toContain(
      "concept.sampling-overview",
    );
    expect(
      getConceptById("concept.autoregressive-generation")?.relatedIds,
    ).toContain("concept.sampling-overview");

    expect(getConceptById("concept.sampling-overview")?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.greedy-decoding",
        "concept.top-k-sampling",
        "concept.top-p-sampling",
      ]),
    );
    expect(getConceptById("concept.greedy-decoding")?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.top-k-sampling",
        "concept.top-p-sampling",
      ]),
    );
    expect(getConceptById("concept.top-k-sampling")?.relatedIds).toContain(
      "concept.top-p-sampling",
    );
    expect(getConceptById("concept.top-p-sampling")?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.sampling-overview",
        "concept.greedy-decoding",
        "concept.top-k-sampling",
        "concept.temperature",
      ]),
    );
  });

  test("Vietnamese shipped-locale surfaces exclude untranslated Phase 5 sampling pages", async () => {
    const localizedPages = await loadShippedLocalizedDocsPages("vi");
    const localizedSlugs = localizedPages.map((page) => page.docsSlug);
    const localizedMeta = await loadSearchResultMetaMap("vi");

    for (const page of PHASE_5_SAMPLING_DOCS) {
      const localizedUrl = `/vi${page.url}`;
      const docsSegments = page.docsSlug.split("/");

      expect(localizedSlugs).not.toContain(page.docsSlug);
      expect(isShippedLocalizedDocsSlug(page.docsSlug, "vi")).toBe(false);
      expect(localizedMeta.has(localizedUrl)).toBe(false);

      const metadata = await buildDocsPageMetadata(docsSegments);
      expect(metadata.alternates).toEqual({
        canonical: page.url,
        languages: {
          en: page.url,
        },
      });

      const results = await docsSearchApi.search(page.query, { locale: "vi" });
      expect(results.some((result) => result.url === localizedUrl)).toBe(false);
    }
  });
});
