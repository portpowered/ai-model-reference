/**
 * Retained per derived-page-validation policy: search and discovery wiring for
 * representative CLIP paper queries cannot be expressed as derived bundle invariants.
 */
import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const CLIP_PAPER_URL =
  "/docs/papers/learning-transferable-visual-models-from-natural-language-supervision";

describe("CLIP paper discovery surfaces (clip-paper-page-004)", () => {
  test("published route is indexed with CLIP aliases and adjacent related records", async () => {
    const pages = await loadPublishedDocsPages("en");
    expect(pages.some((page) => page.url === CLIP_PAPER_URL)).toBe(true);

    const documents = buildSearchDocuments(pages, await loadRegistry());
    const clipDocument = documents.find(
      (document) => document.url === CLIP_PAPER_URL,
    );

    expect(clipDocument).toBeDefined();
    expect(clipDocument?.aliases).toContain("CLIP");
    expect(clipDocument?.aliases).toContain("CLIP paper");
    expect(clipDocument?.relatedIds).toContain("concept.multimodal-model");
    expect(clipDocument?.relatedIds).toContain(
      "module.clip-image-tokenization",
    );
  });

  test.each([
    "CLIP",
    "CLIP paper",
    "Learning Transferable Visual Models From Natural Language Supervision",
    "contrastive image text",
  ])("search routes %s to the canonical CLIP paper page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(CLIP_PAPER_URL);
  });

  test("multimodal representation search exposes the CLIP paper as a direct result", async () => {
    const results = await docsSearchApi.search("multimodal representation");

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.url === CLIP_PAPER_URL)).toBe(true);
  });
});
