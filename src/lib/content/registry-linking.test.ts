import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  hasPublishedDocsPageForRecord,
  registryRecordHref,
} from "@/lib/content/registry-linking";
import { getConceptById, getModuleById } from "@/lib/content/registry-runtime";

describe("registry-linking", () => {
  test("registryRecordHref derives concept routes from published page location", () => {
    const moduleBackedConcept = getConceptById("concept.feed-forward-network");
    const conceptSectionConcept = getConceptById("concept.quantization");
    const glossaryConcept = getConceptById("concept.token");

    if (!moduleBackedConcept || !conceptSectionConcept || !glossaryConcept) {
      throw new Error("expected representative concept records in registry");
    }

    expect(registryRecordHref(moduleBackedConcept)).toBe(
      "/docs/concepts/feed-forward-network",
    );
    expect(registryRecordHref(conceptSectionConcept)).toBe(
      "/docs/concepts/quantization",
    );
    expect(registryRecordHref(glossaryConcept)).toBe("/docs/glossary/token");
  });

  test("published docs presence includes module-backed concepts derived from module pages", () => {
    const moduleBackedConcept = getConceptById("concept.feed-forward-network");
    const moduleRecord = getModuleById("module.feed-forward-network");

    if (!moduleBackedConcept || !moduleRecord) {
      throw new Error("expected feed-forward network records in registry");
    }

    expect(
      hasPublishedDocsPageForRecord(
        moduleBackedConcept,
        PUBLISHED_DOCS_REGISTRY_IDS,
      ),
    ).toBe(true);
    expect(
      hasPublishedDocsPageForRecord(moduleRecord, PUBLISHED_DOCS_REGISTRY_IDS),
    ).toBe(true);
  });
});
