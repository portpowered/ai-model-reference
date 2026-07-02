import { describe, expect, test } from "bun:test";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
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

  test("places seeded glossary pages into model-types and inference browse sections", async () => {
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
      expect.arrayContaining([
        "glossary/world-model",
        "glossary/generative-model",
        "glossary/encoder",
      ]),
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

  test("keeps classified glossary pages out of the remaining glossary browse section", async () => {
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
    expect(
      glossarySection?.entries.some(
        (entry) => entry.slug === "glossary/world-model",
      ),
    ).toBe(false);
    expect(
      glossarySection?.entries.some(
        (entry) => entry.slug === "glossary/temperature",
      ),
    ).toBe(false);
    expect(
      glossarySection?.entries.some((entry) => entry.slug === "glossary/token"),
    ).toBe(true);
  });

  test("matches glossary pages through registry concept classification", async () => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const worldModelPage = pages.find(
      (page) => page.docsSlug === "glossary/world-model",
    );
    expect(worldModelPage).toBeDefined();
    if (!worldModelPage) {
      return;
    }
    expect(
      glossaryPageBelongsToDerivedSection(worldModelPage, "model-types"),
    ).toBe(true);
  });
});
