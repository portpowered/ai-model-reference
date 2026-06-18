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

describe("Phase 5 quantization performance myth concept page (chapter-5-quantization-005)", () => {
  test("registry record publishes the 4-bit performance myth page with expected aliases, citations, and related docs", () => {
    const record = getConceptById(
      "concept.why-4-bit-models-are-not-exactly-4x-faster",
    );

    expect(record?.status).toBe("published");
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "4-bit faster",
      "4x faster myth",
      "why quantization is not 4x faster",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
      "citation.awq",
      "citation.kivi-kv-cache-quantization",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.quantization",
      "concept.weight-only-quantization",
      "concept.activation-quantization",
      "concept.kv-cache-quantization",
      "concept.dynamic-quantization",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has(
        "concept.why-4-bit-models-are-not-exactly-4x-faster",
      ),
    ).toBe(true);
  });

  test("curated related links connect the page back to overview and the nearby quantization methods", () => {
    const source = getConceptById(
      "concept.why-4-bit-models-are-not-exactly-4x-faster",
    );
    if (!source) {
      throw new Error(
        "expected concept.why-4-bit-models-are-not-exactly-4x-faster in registry",
      );
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
        (item) => item.registryId === "concept.weight-only-quantization",
      )?.href,
    ).toBe("/docs/concepts/weight-only-quantization");
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

  test("page renders the tradeoff explanation and links back to the concrete quantization methods", async () => {
    const page = await loadConceptPage(
      "why-4-bit-models-are-not-exactly-4x-faster",
    );
    const html = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        page.content,
      ),
    );

    expect(html).toContain("exactly four times faster");
    expect(html).toContain("dequantization");
    expect(html).toContain("stay BF16 or FP16");
    expect(html).toContain("batching effects");
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/concepts/weight-only-quantization"');
    expect(html).toContain('href="/docs/concepts/activation-quantization"');
    expect(html).toContain('href="/docs/concepts/kv-cache-quantization"');
    expect(html).not.toContain("benchmark leaderboard");
    expect(html).not.toContain("Phase");
  });

  test("search documents and live search return the page for representative misconception queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) =>
        entry.url ===
        "/docs/concepts/why-4-bit-models-are-not-exactly-4x-faster",
    );

    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "4-bit faster",
        "why quantization is not 4x faster",
      ]),
    );
    expect(document?.bodyText).toContain("kernel launch overhead");
    expect(document?.bodyText).toContain("throughput");

    expect(
      (await docsSearchApi.search("4-bit faster")).some(
        (result) =>
          result.url ===
          "/docs/concepts/why-4-bit-models-are-not-exactly-4x-faster",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("4x faster")).some(
        (result) =>
          result.url ===
          "/docs/concepts/why-4-bit-models-are-not-exactly-4x-faster",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("why quantization is not 4x faster")).some(
        (result) =>
          result.url ===
          "/docs/concepts/why-4-bit-models-are-not-exactly-4x-faster",
      ),
    ).toBe(true);
  });
});
