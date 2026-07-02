import { describe, expect, test } from "bun:test";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildDocsBrowseSections,
  DOCS_BROWSE_SECTION_ORDER,
} from "@/lib/docs/browse-collection-sections";
import {
  buildGlossaryDerivedBrowseSections,
  conceptRecordBelongsToClassificationBranch,
  glossaryPageBelongsToDerivedSection,
} from "@/lib/docs/glossary-derived-browse-sections";
import { defaultLocale } from "@/lib/i18n/locale-routing";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const MODEL_TYPE_GLOSSARY_SLUGS = [
  "glossary/world-model",
  "glossary/generative-model",
  "glossary/multimodal-model",
  "glossary/autoregressive-generation",
  "glossary/encoder",
  "glossary/decoder",
  "glossary/encoder-decoder",
] as const;

const MODEL_TYPE_CLASSIFICATION_ID = "classification.concept.model-type";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("glossary derived browse sections", () => {
  test("resolves model-type and inference membership from canonical classification ids", () => {
    expect(
      conceptRecordBelongsToClassificationBranch(
        { primaryClassificationId: "classification.concept.model-type" },
        "classification.concept.model-type",
      ),
    ).toBe(true);
    expect(
      conceptRecordBelongsToClassificationBranch(
        { primaryClassificationId: "classification.concept.inference" },
        "classification.concept.inference",
      ),
    ).toBe(true);
    expect(
      conceptRecordBelongsToClassificationBranch(
        { primaryClassificationId: "classification.concept.math" },
        "classification.concept.model-type",
      ),
    ).toBe(false);
  });

  test("places model-family glossary pages into the model-types browse section", async () => {
    const messages = await loadUiMessages();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildGlossaryDerivedBrowseSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    expect(sections.map((section) => section.id)).toEqual([
      "model-types",
      "inference",
    ]);

    const modelTypes = sections.find((section) => section.id === "model-types");
    expect(modelTypes?.entries.map((entry) => entry.slug)).toEqual(
      expect.arrayContaining([...MODEL_TYPE_GLOSSARY_SLUGS]),
    );

    const inference = sections.find((section) => section.id === "inference");
    expect(inference?.entries.map((entry) => entry.slug)).toEqual(
      expect.arrayContaining([
        "glossary/temperature",
        "glossary/kv-cache",
        "glossary/sampling-overview",
      ]),
    );
  });

  test("keeps classified model-family glossary pages out of the remaining glossary browse section", async () => {
    const messages = await loadUiMessages();
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

    const glossarySection = sections.find(
      (section) => section.id === "glossary",
    );
    for (const slug of MODEL_TYPE_GLOSSARY_SLUGS) {
      expect(
        glossarySection?.entries.some((entry) => entry.slug === slug),
      ).toBe(false);
    }
    expect(
      glossarySection?.entries.some(
        (entry) => entry.slug === "glossary/temperature",
      ),
    ).toBe(false);
    expect(
      glossarySection?.entries.some((entry) => entry.slug === "glossary/token"),
    ).toBe(true);
  });

  test.each(
    MODEL_TYPE_GLOSSARY_SLUGS.map((slug) => [slug] as const),
  )("matches %s through registry model-type classification", async (slug) => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const page = pages.find((entry) => entry.docsSlug === slug);
    expect(page).toBeDefined();
    if (!page) {
      return;
    }
    expect(glossaryPageBelongsToDerivedSection(page, "model-types")).toBe(true);
  });

  test("search documents for model-family terms expose model-type classification context", async () => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of MODEL_TYPE_GLOSSARY_SLUGS) {
      const url = `/docs/${slug}`;
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.topology.primaryClassificationId).toBe(
        MODEL_TYPE_CLASSIFICATION_ID,
      );
      expect(document?.facets.primaryClassificationId).toBe(
        MODEL_TYPE_CLASSIFICATION_ID,
      );
      expect(document?.topology.primaryClassification?.slug).toBe(
        "concept-model-type",
      );
    }
  });

  test.each([
    { query: "world model", url: "/docs/glossary/world-model" },
    { query: "multimodal model", url: "/docs/glossary/multimodal-model" },
  ] as const)("search for %s returns canonical page with model-type classification context", async ({
    query,
    url,
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
    expect(document?.topology.primaryClassificationId).toBe(
      MODEL_TYPE_CLASSIFICATION_ID,
    );
  });
});
