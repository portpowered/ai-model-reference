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

describe("Phase 5 quantization workflow concept pages (chapter-5-quantization-003)", () => {
  test("registry records publish post-training quantization and calibration with expected links and citations", () => {
    const ptq = getConceptById("concept.post-training-quantization");
    expect(ptq?.status).toBe("published");
    expect(ptq?.conceptType).toBe("inference");
    expect(ptq?.aliases).toEqual([
      "PTQ",
      "post training quantization",
      "offline quantization",
    ]);
    expect(ptq?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
      "citation.smoothquant",
    ]);
    expect(ptq?.relatedIds).toEqual([
      "concept.quantization",
      "concept.calibration",
      "concept.weight-only-quantization",
      "concept.activation-quantization",
      "concept.quantization-aware-training",
      "concept.dynamic-quantization",
    ]);

    const calibration = getConceptById("concept.calibration");
    expect(calibration?.status).toBe("published");
    expect(calibration?.conceptType).toBe("inference");
    expect(calibration?.aliases).toEqual([
      "quantization calibration",
      "representative dataset",
      "activation ranges",
    ]);
    expect(calibration?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
      "citation.smoothquant",
    ]);

    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.post-training-quantization"),
    ).toBe(true);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.calibration")).toBe(true);
  });

  test("curated related links connect PTQ, calibration, and nearby runtime quantization methods", () => {
    const source = getConceptById("concept.post-training-quantization");
    if (!source) {
      throw new Error(
        "expected concept.post-training-quantization in registry",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.calibration")?.href,
    ).toBe("/docs/concepts/calibration");
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
  });

  test("PTQ and calibration pages render workflow explanations and cross-links", async () => {
    const ptqPage = await loadConceptPage("post-training-quantization");
    const ptqHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: ptqPage.messages,
          assets: ptqPage.assets,
        },
        ptqPage.content,
      ),
    );
    expect(ptqHtml).toContain("already been trained");
    expect(ptqHtml).toContain("accuracy can drift");
    expect(ptqHtml).toContain('href="/docs/concepts/calibration"');
    expect(ptqHtml).toContain('href="/docs/concepts/weight-only-quantization"');
    expect(ptqHtml).toContain('href="/docs/concepts/activation-quantization"');
    expect(ptqHtml).toContain(
      'href="/docs/concepts/quantization-aware-training"',
    );
    expect(ptqHtml).toContain('href="/docs/concepts/dynamic-quantization"');

    const calibrationPage = await loadConceptPage("calibration");
    const calibrationHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: calibrationPage.messages,
          assets: calibrationPage.assets,
        },
        calibrationPage.content,
      ),
    );
    expect(calibrationHtml).toContain("representative inputs");
    expect(calibrationHtml).toContain("realistic ranges");
    expect(calibrationHtml).toContain(
      'href="/docs/concepts/post-training-quantization"',
    );
    expect(calibrationHtml).toContain(
      'href="/docs/concepts/activation-quantization"',
    );
  });

  test("search documents and live search return PTQ and calibration for representative workflow queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const ptqDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/post-training-quantization",
    );
    expect(ptqDocument?.aliases).toEqual(
      expect.arrayContaining(["PTQ", "post training quantization"]),
    );
    expect(ptqDocument?.bodyText).toContain("calibration");

    const calibrationDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/calibration",
    );
    expect(calibrationDocument?.aliases).toEqual(
      expect.arrayContaining(["representative dataset", "activation ranges"]),
    );
    expect(calibrationDocument?.bodyText).toContain(
      "normal deployment traffic",
    );

    expect(
      (await docsSearchApi.search("PTQ")).some(
        (result) => result.url === "/docs/concepts/post-training-quantization",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("representative dataset")).some(
        (result) => result.url === "/docs/concepts/calibration",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("activation ranges")).some(
        (result) => result.url === "/docs/concepts/calibration",
      ),
    ).toBe(true);
  });
});
