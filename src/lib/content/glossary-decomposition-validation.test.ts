import { describe, expect, test } from "bun:test";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getConceptById } from "@/lib/content/registry-runtime";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildDocsBrowseSections,
  DOCS_BROWSE_SECTION_ORDER,
} from "@/lib/docs/browse-collection-sections";
import {
  glossaryPageBelongsToDerivedSection,
  isGlossaryPageAssignedToDerivedSection,
} from "@/lib/docs/glossary-derived-browse-sections";
import { defaultLocale } from "@/lib/i18n/locale-routing";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REPRESENTATIVE_PLACEMENTS = [
  {
    sectionId: "model-types",
    slug: "glossary/world-model",
    classificationId: "classification.concept.model-type",
  },
  {
    sectionId: "inference",
    slug: "glossary/temperature",
    classificationId: "classification.concept.inference",
  },
  {
    sectionId: "module-components",
    slug: "glossary/softmax",
    classificationId: "classification.concept.module",
  },
  {
    sectionId: "glossary",
    slug: "glossary/token",
    classificationId: "classification.concept.architecture",
  },
] as const;

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("glossary decomposition validation (glossary-decomposition-006)", () => {
  test("browse sections expose derived and residual glossary placements in stable order", async () => {
    const messages = await loadUiMessages(defaultLocale);
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildDocsBrowseSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    expect(sections.map((section) => section.id)).toEqual(
      DOCS_BROWSE_SECTION_ORDER.map((sectionRef) =>
        sectionRef.kind === "collection" ? sectionRef.id : sectionRef.id,
      ),
    );

    for (const placement of REPRESENTATIVE_PLACEMENTS) {
      const section = sections.find(
        (entry) => entry.id === placement.sectionId,
      );
      expect(
        section?.entries.some((entry) => entry.slug === placement.slug),
      ).toBe(true);

      const record = getConceptById(
        pages.find((page) => page.docsSlug === placement.slug)?.frontmatter
          .registryId ?? "",
      );
      expect(record?.primaryClassificationId).toBe(placement.classificationId);
    }
  });

  test("foundation glossary pages stay in the residual glossary browse section", async () => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const token = pages.find((page) => page.docsSlug === "glossary/token");
    expect(token).toBeDefined();
    if (!token) {
      return;
    }

    expect(isGlossaryPageAssignedToDerivedSection(token)).toBe(false);
    expect(glossaryPageBelongsToDerivedSection(token, "model-types")).toBe(
      false,
    );
    expect(glossaryPageBelongsToDerivedSection(token, "inference")).toBe(false);
    expect(
      glossaryPageBelongsToDerivedSection(token, "module-components"),
    ).toBe(false);

    const entropy = pages.find((page) => page.docsSlug === "glossary/entropy");
    expect(entropy).toBeDefined();
    expect(getConceptById("concept.entropy")?.primaryClassificationId).toBe(
      "classification.concept.math",
    );
  });

  test.each([
    {
      query: "world model",
      url: "/docs/glossary/world-model",
      classificationId: "classification.concept.model-type",
    },
    {
      query: "temperature",
      url: "/docs/glossary/temperature",
      classificationId: "classification.concept.inference",
    },
    {
      query: "softmax",
      url: "/docs/glossary/softmax",
      classificationId: "classification.concept.module",
    },
    {
      query: "entropy",
      url: "/docs/glossary/entropy",
      classificationId: "classification.concept.math",
    },
  ] as const)("search for %s returns canonical page with expected classification context", async ({
    query,
    url,
    classificationId,
  }) => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => pageBaseUrl(result.url) === url)).toBe(
      true,
    );

    const document = documents.find((entry) => entry.url === url);
    expect(document?.topology.primaryClassificationId).toBe(classificationId);
    expect(document?.facets.primaryClassificationId).toBe(classificationId);
  });
});
