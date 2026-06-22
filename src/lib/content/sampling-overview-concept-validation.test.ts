import { describe, expect, test } from "bun:test";
import { loadConceptPage } from "@/lib/content/concept-page";
import {
  CONCEPTS_DOCS_ROOT,
  getDocsPageDir,
  SAMPLING_OVERVIEW_CONCEPT_PAGE_DIR,
} from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntriesBySlug,
  getPublishedDocsEntryByRegistryId,
} from "@/lib/content/published-docs-registry-ids";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";

describe("sampling overview canonical validation (sampling-overview-concept-page-004)", () => {
  test("canonical concept path helpers resolve the sampling overview page directory", () => {
    expect(getDocsPageDir("concepts", "sampling-overview")).toBe(
      SAMPLING_OVERVIEW_CONCEPT_PAGE_DIR,
    );
    expect(SAMPLING_OVERVIEW_CONCEPT_PAGE_DIR).toBe(
      `${CONCEPTS_DOCS_ROOT}/sampling-overview`,
    );
  });

  test("published docs registry keeps one shared record while preferring the canonical concept route", () => {
    const entries = getPublishedDocsEntriesBySlug("sampling-overview");

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.docsSlug).sort()).toEqual([
      "concepts/sampling-overview",
      "glossary/sampling-overview",
    ]);

    const canonicalEntry = getPublishedDocsEntryByRegistryId(
      "concept.sampling-overview",
    );
    expect(canonicalEntry?.docsSlug).toBe("concepts/sampling-overview");
    expect(canonicalEntry?.url).toBe("/docs/concepts/sampling-overview");
    expect(canonicalEntry?.pageKind).toBe("concept");
  });

  test("default English page loading and search metadata expose the canonical route", async () => {
    const page = await loadConceptPage("sampling-overview");
    const pages = await loadPublishedDocsPages("en");
    const searchMeta = await loadSearchResultMetaMap("en");

    expect(page.frontmatter.registryId).toBe("concept.sampling-overview");
    expect(page.messages.title).toBe("Sampling Overview");

    expect(
      pages.some(
        (entry) =>
          entry.docsSlug === "concepts/sampling-overview" &&
          entry.url === "/docs/concepts/sampling-overview" &&
          entry.frontmatter.registryId === "concept.sampling-overview",
      ),
    ).toBe(true);

    const meta = searchMeta.get("/docs/concepts/sampling-overview");
    expect(meta?.title).toBe("Sampling Overview");
    expect(meta?.kind).toBe("concept");
    expect(meta?.aliases).toEqual(
      expect.arrayContaining([
        "sampling overview",
        "token sampling",
        "next-token sampling",
        "sampling basics",
      ]),
    );
  });
});
