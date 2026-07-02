import { describe, expect, test } from "bun:test";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildBrowseCollectionSections,
  DOCS_BROWSE_COLLECTION_IDS,
} from "@/lib/docs/browse-collection-sections";
import { getDocsCollectionDefinition } from "@/lib/docs/docs-collection-definitions";
import { buildLocalizedRoute, defaultLocale } from "@/lib/i18n/locale-routing";

describe("browse collection sections", () => {
  test("builds sections in the current browse order from collection definitions", async () => {
    const messages = await loadUiMessages();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildBrowseCollectionSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    expect(sections.map((section) => section.id)).toEqual([
      ...DOCS_BROWSE_COLLECTION_IDS,
    ]);
    expect(sections.map((section) => section.title)).toEqual([
      messages.browseIndex.modelsSectionTitle,
      messages.browseIndex.modulesSectionTitle,
      messages.browseIndex.conceptsSectionTitle,
      messages.browseIndex.papersSectionTitle,
      messages.browseIndex.trainingSectionTitle,
      messages.browseIndex.systemsSectionTitle,
      messages.browseIndex.glossarySectionTitle,
    ]);
  });

  test("filters pages by each collection frontmatter kind and preserves starter priority", async () => {
    const messages = await loadUiMessages();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildBrowseCollectionSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    const modelsSection = sections.find((section) => section.id === "models");
    expect(modelsSection?.entries[0]?.slug).toBe("models/gpt-3");

    const modulesSection = sections.find((section) => section.id === "modules");
    expect(modulesSection?.entries.map((entry) => entry.slug)).toEqual([
      "modules/grouped-query-attention",
      "modules/attention",
      "modules/swiglu",
      "modules/relu",
      "modules/multi-head-attention",
      "modules/feed-forward-network",
    ]);

    const glossarySection = sections.find(
      (section) => section.id === "glossary",
    );
    const glossaryStarterSlugs = [
      ...getDocsCollectionDefinition("glossary").starterSlugs,
    ];
    expect(glossarySection?.entries[0]?.slug).toBe(glossaryStarterSlugs[0]);
    expect(glossarySection?.entries.map((entry) => entry.slug)).not.toContain(
      "glossary/kv-cache",
    );
    expect(glossarySection?.entries.map((entry) => entry.slug)).not.toContain(
      "glossary/world-model",
    );
  });

  test("resolves browse link hrefs for docs collections and glossary index", async () => {
    const messages = await loadUiMessages();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildBrowseCollectionSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    expect(sections.find((section) => section.id === "models")?.linkHref).toBe(
      buildLocalizedRoute(
        { surface: "docs-page", slug: "models" },
        defaultLocale,
      ),
    );
    expect(
      sections.find((section) => section.id === "glossary")?.linkHref,
    ).toBe(buildLocalizedRoute({ surface: "glossary-index" }, defaultLocale));
  });

  test("resolves browse message keys for section descriptions and link labels", async () => {
    const messages = await loadUiMessages();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildBrowseCollectionSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    const conceptsSection = sections.find(
      (section) => section.id === "concepts",
    );
    expect(conceptsSection?.description).toBe(
      messages.browseIndex.conceptsSectionDescription,
    );
    expect(conceptsSection?.linkLabel).toBe(
      messages.browseIndex.conceptsSectionLinkLabel,
    );
  });
});
