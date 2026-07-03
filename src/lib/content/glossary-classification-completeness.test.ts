import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getConceptById } from "@/lib/content/registry-runtime";
import type { ConceptRecord } from "@/lib/content/schemas";
import {
  resolveGlossarySidebarGroupWithSource,
  type SidebarGroupingSource,
} from "@/lib/content/sidebar-grouping";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildDocsBrowseSections,
  DOCS_BROWSE_SECTION_ORDER,
} from "@/lib/docs/browse-collection-sections";
import { isGlossaryPageAssignedToDerivedSection } from "@/lib/docs/glossary-derived-browse-sections";
import { defaultLocale } from "@/lib/i18n/locale-routing";

const REMAINING_GLOSSARY_CLASSIFICATIONS = {
  "concept.architecture": "classification.concept.architecture",
  "concept.model": "classification.concept.architecture",
  "concept.module": "classification.concept.architecture",
  "concept.component": "classification.concept.architecture",
  "concept.token": "classification.concept.architecture",
  "concept.transformer": "classification.concept.architecture",
  "concept.context-window": "classification.concept.architecture",
  "concept.special-tokens": "classification.concept.architecture",
  "concept.denoising-generation": "classification.concept.architecture",
  "concept.conditioning": "classification.concept.architecture",
  "concept.representation": "classification.concept.architecture",
  "concept.patch": "classification.concept.architecture",
  "concept.gradient": "classification.concept.math",
  "concept.entropy": "classification.concept.math",
  "concept.backpropagation": "classification.concept.math",
  "concept.loss-function": "classification.concept.math",
  "concept.computational-graph": "classification.concept.math",
  "concept.parameter": "classification.concept.math",
  "concept.latent": "classification.concept.math",
  "concept.latent-space": "classification.concept.architecture",
  "concept.hidden-size": "classification.concept.math",
  "concept.alignment": "classification.concept.training",
  "concept.model-capacity": "classification.concept.training",
  "concept.overfitting": "classification.concept.training",
  "concept.optimizer-state": "classification.concept.training",
  "concept.generalization": "classification.concept.evaluation",
  "concept.scaling-law": "classification.concept.evaluation",
  "concept.emergent-behavior": "classification.concept.evaluation",
  "concept.perplexity": "classification.concept.evaluation",
} as const;

describe("glossary classification completeness (glossary-decomposition-005)", () => {
  test("every published glossary page has an explicit primary classification", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages(defaultLocale);
    const glossaryPages = pages.filter(
      (page) => page.frontmatter.kind === "glossary",
    );

    const missing = glossaryPages
      .map((page) => {
        const record = registry.byId.get(page.frontmatter.registryId) as
          | ConceptRecord
          | undefined;
        return {
          slug: page.docsSlug,
          primaryClassificationId: record?.primaryClassificationId,
        };
      })
      .filter((entry) => !entry.primaryClassificationId);

    expect(missing).toEqual([]);
  });

  test("remaining glossary pages resolve sidebar placement from ontology or explicit editorial fallback", async () => {
    const pages = await loadPublishedDocsPages(defaultLocale);
    const remainingPages = pages.filter(
      (page) =>
        page.frontmatter.kind === "glossary" &&
        !isGlossaryPageAssignedToDerivedSection(page),
    );

    for (const page of remainingPages) {
      const record = getConceptById(page.frontmatter.registryId);
      expect(record?.primaryClassificationId).toBeDefined();

      const resolution = resolveGlossarySidebarGroupWithSource(record ?? {});
      expect(resolution?.groupId).toBeDefined();
      expect([
        "derived-taxonomy",
        "editorial-sidebar-grouping",
      ] as const).toContain(resolution?.source as SidebarGroupingSource);
    }
  });

  test("representative remaining glossary classifications stay stable", async () => {
    for (const [recordId, classificationId] of Object.entries(
      REMAINING_GLOSSARY_CLASSIFICATIONS,
    )) {
      const record = getConceptById(recordId);
      expect(record?.primaryClassificationId).toBe(classificationId);
    }
  });

  test("browse section ordering is deterministic across repeated builds", async () => {
    const messages = await loadUiMessages(defaultLocale);
    const pages = await loadPublishedDocsPages(defaultLocale);

    const first = buildDocsBrowseSections({
      pages,
      locale: defaultLocale,
      messages,
    }).map((section) => ({
      id: section.id,
      entrySlugs: section.entries.map((entry) => entry.slug),
    }));

    const second = buildDocsBrowseSections({
      pages,
      locale: defaultLocale,
      messages,
    }).map((section) => ({
      id: section.id,
      entrySlugs: section.entries.map((entry) => entry.slug),
    }));

    expect(first.map((section) => section.id)).toEqual(
      DOCS_BROWSE_SECTION_ORDER.map((sectionRef) =>
        sectionRef.kind === "collection" ? sectionRef.id : sectionRef.id,
      ),
    );
    expect(second).toEqual(first);
  });

  test("browse sections with no published entries still render without duplicate slugs across sibling groups", async () => {
    const messages = await loadUiMessages(defaultLocale);
    const pages = await loadPublishedDocsPages(defaultLocale);
    const sections = buildDocsBrowseSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    const slugsBySection = new Map<string, Set<string>>();
    for (const section of sections) {
      const slugs = new Set(section.entries.map((entry) => entry.slug));
      expect(slugs.size).toBe(section.entries.length);
      slugsBySection.set(section.id, slugs);
    }

    const derivedSectionIds = ["model-types", "inference", "module-components"];
    for (const derivedId of derivedSectionIds) {
      const derivedSlugs = slugsBySection.get(derivedId) ?? new Set();
      const glossarySlugs = slugsBySection.get("glossary") ?? new Set();
      for (const slug of derivedSlugs) {
        expect(glossarySlugs.has(slug)).toBe(false);
      }
    }
  });
});
