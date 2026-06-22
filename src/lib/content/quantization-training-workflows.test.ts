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

describe("Phase 5 quantization training and dynamic workflow concept pages (chapter-5-quantization-004)", () => {
  test("registry records publish QAT and dynamic quantization with expected links and citations", () => {
    const qat = getConceptById("concept.quantization-aware-training");
    expect(qat?.status).toBe("published");
    expect(qat?.primaryClassificationId).toBe(
      "classification.concept.training",
    );
    expect(qat?.aliases).toEqual([
      "QAT",
      "training-aware quantization",
      "fake quantization training",
    ]);
    expect(qat?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
      "citation.smoothquant",
    ]);
    expect(qat?.relatedIds).toEqual([
      "concept.quantization",
      "concept.post-training-quantization",
      "concept.calibration",
      "concept.dynamic-quantization",
      "concept.activation-quantization",
    ]);

    const dynamic = getConceptById("concept.dynamic-quantization");
    expect(dynamic?.status).toBe("published");
    expect(dynamic?.primaryClassificationId).toBe(
      "classification.concept.inference",
    );
    expect(dynamic?.aliases).toEqual([
      "runtime quantization",
      "on-the-fly quantization",
      "dynamic range quantization",
    ]);
    expect(dynamic?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
    ]);
    expect(dynamic?.relatedIds).toEqual([
      "concept.quantization",
      "concept.post-training-quantization",
      "concept.quantization-aware-training",
      "concept.activation-quantization",
      "concept.weight-only-quantization",
    ]);

    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.quantization-aware-training"),
    ).toBe(true);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.dynamic-quantization"),
    ).toBe(true);
  });

  test("curated related links connect QAT and dynamic quantization back to PTQ and nearby workflow pages", () => {
    const qat = getConceptById("concept.quantization-aware-training");
    if (!qat) {
      throw new Error(
        "expected concept.quantization-aware-training in registry",
      );
    }

    const items = deriveCuratedRelatedItems(
      qat,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) => item.registryId === "concept.post-training-quantization",
      )?.href,
    ).toBe("/docs/concepts/post-training-quantization");
    expect(
      items.find((item) => item.registryId === "concept.calibration")?.href,
    ).toBe("/docs/concepts/calibration");
    expect(
      items.find((item) => item.registryId === "concept.dynamic-quantization")
        ?.href,
    ).toBe("/docs/concepts/dynamic-quantization");
  });

  test("QAT and dynamic quantization pages render workflow comparisons and cross-links", async () => {
    const qatPage = await loadConceptPage("quantization-aware-training");
    const qatHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: qatPage.messages,
          assets: qatPage.assets,
        },
        qatPage.content,
      ),
    );
    expect(qatHtml).toContain("fake-quantized values");
    expect(qatHtml).toContain("post-training quantization");
    expect(qatHtml).toContain(
      'href="/docs/concepts/post-training-quantization"',
    );
    expect(qatHtml).toContain('href="/docs/concepts/calibration"');
    expect(qatHtml).toContain('href="/docs/concepts/dynamic-quantization"');

    const dynamicPage = await loadConceptPage("dynamic-quantization");
    const dynamicHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: dynamicPage.messages,
          assets: dynamicPage.assets,
        },
        dynamicPage.content,
      ),
    );
    expect(dynamicHtml).toContain("execution step");
    expect(dynamicHtml).toContain("on the fly");
    expect(dynamicHtml).toContain(
      'href="/docs/concepts/post-training-quantization"',
    );
    expect(dynamicHtml).toContain(
      'href="/docs/concepts/quantization-aware-training"',
    );
    expect(dynamicHtml).toContain(
      'href="/docs/concepts/activation-quantization"',
    );
  });

  test("search documents and live search return QAT and dynamic quantization for representative workflow queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const qatDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/quantization-aware-training",
    );
    expect(qatDocument?.aliases).toEqual(
      expect.arrayContaining(["QAT", "training-aware quantization"]),
    );
    expect(qatDocument?.bodyText).toContain("deployment");

    const dynamicDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/dynamic-quantization",
    );
    expect(dynamicDocument?.aliases).toEqual(
      expect.arrayContaining([
        "runtime quantization",
        "dynamic range quantization",
      ]),
    );
    expect(dynamicDocument?.bodyText).toContain("runtime");

    expect(
      (await docsSearchApi.search("QAT")).some(
        (result) => result.url === "/docs/concepts/quantization-aware-training",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("quantization-aware training")).some(
        (result) => result.url === "/docs/concepts/quantization-aware-training",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("dynamic quantization")).some(
        (result) => result.url === "/docs/concepts/dynamic-quantization",
      ),
    ).toBe(true);
  });
});
