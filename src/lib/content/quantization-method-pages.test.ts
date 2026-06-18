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

describe("Phase 5 quantization method concept pages (chapter-5-quantization-002)", () => {
  test("registry records publish the three quantization methods with expected related docs and citations", () => {
    const weightOnly = getConceptById("concept.weight-only-quantization");
    expect(weightOnly?.status).toBe("published");
    expect(weightOnly?.conceptType).toBe("inference");
    expect(weightOnly?.tags).toEqual(["quantization"]);
    expect(weightOnly?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
      "citation.awq",
    ]);

    const activation = getConceptById("concept.activation-quantization");
    expect(activation?.status).toBe("published");
    expect(activation?.conceptType).toBe("inference");
    expect(activation?.tags).toEqual(["quantization"]);
    expect(activation?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
      "citation.smoothquant",
    ]);

    const kvCache = getConceptById("concept.kv-cache-quantization");
    expect(kvCache?.status).toBe("published");
    expect(kvCache?.conceptType).toBe("inference");
    expect(kvCache?.tags).toEqual(["quantization", "kv-cache"]);
    expect(kvCache?.citationIds).toEqual([
      "citation.kivi-kv-cache-quantization",
    ]);

    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.weight-only-quantization"),
    ).toBe(true);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.activation-quantization"),
    ).toBe(true);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.kv-cache-quantization"),
    ).toBe(true);
  });

  test("curated related links connect overview and sibling quantization methods", () => {
    const source = getConceptById("concept.weight-only-quantization");
    if (!source) {
      throw new Error("expected concept.weight-only-quantization in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.quantization")?.href,
    ).toBe("/docs/concepts/quantization");
    expect(
      items.find(
        (item) => item.registryId === "concept.activation-quantization",
      )?.href,
    ).toBe("/docs/concepts/activation-quantization");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache-quantization")
        ?.href,
    ).toBe("/docs/concepts/kv-cache-quantization");
  });

  test("weight-only, activation, and KV cache pages render tensor-level tradeoffs and sibling links", async () => {
    const weightOnlyPage = await loadConceptPage("weight-only-quantization");
    const weightOnlyHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: weightOnlyPage.messages,
          assets: weightOnlyPage.assets,
        },
        weightOnlyPage.content,
      ),
    );
    expect(weightOnlyHtml).toContain("stored parameter matrix");
    expect(weightOnlyHtml).toContain("higher-precision runtime format");
    expect(weightOnlyHtml).toContain(
      'href="/docs/concepts/activation-quantization"',
    );
    expect(weightOnlyHtml).toContain(
      'href="/docs/concepts/kv-cache-quantization"',
    );

    const activationPage = await loadConceptPage("activation-quantization");
    const activationHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: activationPage.messages,
          assets: activationPage.assets,
        },
        activationPage.content,
      ),
    );
    expect(activationHtml).toContain("intermediate values");
    expect(activationHtml).toContain("outliers");
    expect(activationHtml).toContain(
      'href="/docs/concepts/weight-only-quantization"',
    );

    const kvCachePage = await loadConceptPage("kv-cache-quantization");
    const kvCacheHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: kvCachePage.messages,
          assets: kvCachePage.assets,
        },
        kvCachePage.content,
      ),
    );
    expect(kvCacheHtml).toContain("stores those cached");
    expect(kvCacheHtml).toContain("larger batches");
    expect(kvCacheHtml).toContain('href="/docs/concepts/quantization"');
    expect(kvCacheHtml).toContain(
      'href="/docs/concepts/activation-quantization"',
    );
  });

  test("search documents and live search return the method pages for representative queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const weightOnlyDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/weight-only-quantization",
    );
    expect(weightOnlyDocument?.aliases).toEqual(
      expect.arrayContaining(["weight quantization", "low-bit weights"]),
    );

    const activationDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/activation-quantization",
    );
    expect(activationDocument?.bodyText).toContain("outliers");

    const kvCacheDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/kv-cache-quantization",
    );
    expect(kvCacheDocument?.tags).toEqual(
      expect.arrayContaining(["quantization", "kv-cache"]),
    );

    expect(
      (await docsSearchApi.search("weight-only quantization")).some(
        (result) => result.url === "/docs/concepts/weight-only-quantization",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("activation quantization")).some(
        (result) => result.url === "/docs/concepts/activation-quantization",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("KV cache quantization")).some(
        (result) => result.url === "/docs/concepts/kv-cache-quantization",
      ),
    ).toBe(true);
  });
});
