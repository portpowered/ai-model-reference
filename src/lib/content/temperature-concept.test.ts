import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const CONCEPT_URL = "/docs/concepts/temperature";

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, citations,
 * assets) are covered by `validateDerivedPublishedPageBundles` via `make validate-data`.
 * These tests stay focused on search, related-link navigation, and rendered teaching
 * surface contracts specific to the temperature concept slice.
 */
describe("temperature concept discovery", () => {
  test("curated related links point to softmax and sampling neighbors", () => {
    const source = getConceptById("concept.temperature");
    if (!source) {
      throw new Error("expected concept.temperature in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const hrefById = Object.fromEntries(
      items.map((item) => [item.registryId, item.href]),
    );

    expect(hrefById["concept.softmax"]).toBe("/docs/glossary/softmax");
    expect(hrefById["concept.entropy"]).toBe("/docs/glossary/entropy");
    expect(hrefById["concept.sampling-overview"]).toBe(
      "/docs/glossary/sampling-overview",
    );
    expect(hrefById["concept.greedy-decoding"]).toBe(
      "/docs/glossary/greedy-decoding",
    );
    expect(hrefById["concept.top-k-sampling"]).toBe(
      "/docs/glossary/top-k-sampling",
    );
    expect(hrefById["concept.top-p-sampling"]).toBe(
      "/docs/glossary/top-p-sampling",
    );
  });

  test("live search ranks the canonical temperature concept route first for title queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === CONCEPT_URL);

    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["sampling temperature", "softmax temperature"]),
    );

    const results = await docsSearchApi.search("Temperature");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(CONCEPT_URL);
  });
});

describe("temperature concept page", () => {
  test("rendered page exposes decoding teaching, sampling neighbors, and related links", async () => {
    const page = await loadConceptPage("temperature");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Lower Temperature");
    expect(html).toContain("Higher Temperature");
    expect(html).toContain("Tradeoffs And Limits");
    expect(html).toContain("Sampling Neighbors");
    expect(html.toLowerCase()).toContain("softmax(z / t)");
    expect(html.toLowerCase()).toContain("does not change model");
    expect(html).toContain('href="/docs/glossary/parameter"');
    expect(html.toLowerCase()).toContain("temperature 0");
    expect(html.toLowerCase()).toContain("argmax");
    expect(html.toLowerCase()).toContain("incoherent");
    expect(html.toLowerCase()).toContain("appearance of confidence");
    expect(html.toLowerCase()).toContain("reshapes scores first");
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/glossary/entropy"');
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('href="/docs/glossary/greedy-decoding"');
    expect(html).toContain('href="/docs/glossary/top-k-sampling"');
    expect(html).toContain('href="/docs/glossary/top-p-sampling"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
  });
});
