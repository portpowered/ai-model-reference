import { describe, expect, test } from "bun:test";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getConceptById } from "@/lib/content/registry-runtime";
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
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const MODEL_TYPE_GLOSSARY_SLUGS = [
  "glossary/world-model",
  "glossary/generative-model",
  "glossary/multimodal-model",
  "glossary/autoregressive-generation",
  "glossary/encoder",
  "glossary/decoder",
  "glossary/encoder-decoder",
] as const;

const MODEL_TYPE_CLASSIFICATION_ID = "classification.concept.model-type";

const INFERENCE_GLOSSARY_SLUGS = [
  "glossary/sampling-overview",
  "glossary/top-k-sampling",
  "glossary/top-p-sampling",
  "glossary/greedy-decoding",
  "glossary/temperature",
  "glossary/decode",
  "glossary/prefill-decode-split",
  "glossary/kv-cache",
  "glossary/time-to-first-token",
  "glossary/inter-token-latency",
] as const;

const INFERENCE_CONCEPT_SLUGS = [
  "concepts/prefill",
  "concepts/quantization",
  "concepts/kv-cache-quantization",
  "concepts/post-training-quantization",
] as const;

const INFERENCE_CLASSIFICATION_ID = "classification.concept.inference";

const MODULE_COMPONENT_GLOSSARY_SLUGS = [
  "glossary/softmax",
  "glossary/residual-connection",
  "glossary/skip-connection",
  "glossary/activation",
  "glossary/normalization",
  "glossary/embedding",
  "glossary/logit",
  "glossary/tensor",
  "glossary/vector",
  "glossary/vocabulary-size",
] as const;

const MODULE_COMPONENT_CLASSIFICATION_ID = "classification.concept.module";

const SYSTEM_INFERENCE_RELATED_URLS = [
  "/docs/systems/inference-engine",
  "/docs/systems/batching",
  "/docs/systems/dynamic-batching",
  "/docs/systems/continuous-batching",
  "/docs/systems/request-scheduling",
  "/docs/systems/speculative-decoding",
  "/docs/systems/on-disk-kv-cache",
] as const;

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

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

  test("places model-family glossary pages into the model-types browse section", async () => {
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
      "module-components",
    ]);

    const modelTypes = sections.find((section) => section.id === "model-types");
    expect(modelTypes?.entries.map((entry) => entry.slug)).toEqual(
      expect.arrayContaining([...MODEL_TYPE_GLOSSARY_SLUGS]),
    );

    const inference = sections.find((section) => section.id === "inference");
    expect(inference?.entries.map((entry) => entry.slug)).toEqual(
      expect.arrayContaining([...INFERENCE_GLOSSARY_SLUGS]),
    );

    const moduleComponents = sections.find(
      (section) => section.id === "module-components",
    );
    expect(moduleComponents?.entries.map((entry) => entry.slug)).toEqual(
      expect.arrayContaining([...MODULE_COMPONENT_GLOSSARY_SLUGS]),
    );
  });

  test("keeps classified module-component glossary pages out of the remaining glossary browse section", async () => {
    const messages = await loadUiMessages();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildDocsBrowseSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    const glossarySection = sections.find(
      (section) => section.id === "glossary",
    );
    for (const slug of MODULE_COMPONENT_GLOSSARY_SLUGS) {
      expect(
        glossarySection?.entries.some((entry) => entry.slug === slug),
      ).toBe(false);
    }
    expect(
      glossarySection?.entries.some((entry) => entry.slug === "glossary/token"),
    ).toBe(true);
  });

  test("keeps classified inference glossary pages out of the remaining glossary browse section", async () => {
    const messages = await loadUiMessages();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const sections = buildDocsBrowseSections({
      pages,
      locale: defaultLocale,
      messages,
    });

    const glossarySection = sections.find(
      (section) => section.id === "glossary",
    );
    for (const slug of INFERENCE_GLOSSARY_SLUGS) {
      expect(
        glossarySection?.entries.some((entry) => entry.slug === slug),
      ).toBe(false);
    }
    expect(
      glossarySection?.entries.some((entry) => entry.slug === "glossary/token"),
    ).toBe(true);
  });

  test("keeps classified model-family glossary pages out of the remaining glossary browse section", async () => {
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
    for (const slug of MODEL_TYPE_GLOSSARY_SLUGS) {
      expect(
        glossarySection?.entries.some((entry) => entry.slug === slug),
      ).toBe(false);
    }
    expect(
      glossarySection?.entries.some(
        (entry) => entry.slug === "glossary/temperature",
      ),
    ).toBe(false);
    expect(
      glossarySection?.entries.some((entry) => entry.slug === "glossary/token"),
    ).toBe(true);
  });

  test.each(
    MODEL_TYPE_GLOSSARY_SLUGS.map((slug) => [slug] as const),
  )("matches %s through registry model-type classification", async (slug) => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const page = pages.find((entry) => entry.docsSlug === slug);
    expect(page).toBeDefined();
    if (!page) {
      return;
    }
    expect(glossaryPageBelongsToDerivedSection(page, "model-types")).toBe(true);
  });

  test("search documents for model-family terms expose model-type classification context", async () => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of MODEL_TYPE_GLOSSARY_SLUGS) {
      const url = `/docs/${slug}`;
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.topology.primaryClassificationId).toBe(
        MODEL_TYPE_CLASSIFICATION_ID,
      );
      expect(document?.facets.primaryClassificationId).toBe(
        MODEL_TYPE_CLASSIFICATION_ID,
      );
      expect(document?.topology.primaryClassification?.slug).toBe(
        "concept-model-type",
      );
    }
  });

  test.each([
    { query: "world model", url: "/docs/glossary/world-model" },
    { query: "multimodal model", url: "/docs/glossary/multimodal-model" },
  ] as const)("search for %s returns canonical page with model-type classification context", async ({
    query,
    url,
  }) => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => pageBaseUrl(result.url) === url)).toBe(
      true,
    );

    const document = documents.find((entry) => entry.url === url);
    expect(document?.topology.primaryClassificationId).toBe(
      MODEL_TYPE_CLASSIFICATION_ID,
    );
  });

  test.each(
    INFERENCE_GLOSSARY_SLUGS.map((slug) => [slug] as const),
  )("matches %s through registry inference classification", async (slug) => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const page = pages.find((entry) => entry.docsSlug === slug);
    expect(page).toBeDefined();
    if (!page) {
      return;
    }
    expect(glossaryPageBelongsToDerivedSection(page, "inference")).toBe(true);
  });

  test("search documents for inference terms expose inference classification context", async () => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of INFERENCE_GLOSSARY_SLUGS) {
      const url = `/docs/${slug}`;
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.topology.primaryClassificationId).toBe(
        INFERENCE_CLASSIFICATION_ID,
      );
      expect(document?.facets.primaryClassificationId).toBe(
        INFERENCE_CLASSIFICATION_ID,
      );
      expect(document?.topology.primaryClassification?.slug).toBe(
        "concept-inference",
      );
    }
  });

  test("search documents for inference concept routes expose inference classification context", async () => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of INFERENCE_CONCEPT_SLUGS) {
      const url = `/docs/${slug}`;
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.topology.primaryClassificationId).toBe(
        INFERENCE_CLASSIFICATION_ID,
      );
      expect(document?.facets.primaryClassificationId).toBe(
        INFERENCE_CLASSIFICATION_ID,
      );
    }
  });

  test.each([
    { query: "temperature", url: "/docs/glossary/temperature" },
    { query: "KV cache", url: "/docs/glossary/kv-cache" },
    { query: "quantization", url: "/docs/concepts/quantization" },
    { query: "prefill", url: "/docs/concepts/prefill" },
  ] as const)("search for %s returns canonical page with inference classification context", async ({
    query,
    url,
  }) => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => pageBaseUrl(result.url) === url)).toBe(
      true,
    );

    const document = documents.find((entry) => entry.url === url);
    expect(document?.topology.primaryClassificationId).toBe(
      INFERENCE_CLASSIFICATION_ID,
    );
  });

  test.each(
    MODULE_COMPONENT_GLOSSARY_SLUGS.map((slug) => [slug] as const),
  )("matches %s through registry module-component classification", async (slug) => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const page = pages.find((entry) => entry.docsSlug === slug);
    expect(page).toBeDefined();
    if (!page) {
      return;
    }
    expect(glossaryPageBelongsToDerivedSection(page, "module-components")).toBe(
      true,
    );
  });

  test("search documents for module-component terms expose module classification context", async () => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of MODULE_COMPONENT_GLOSSARY_SLUGS) {
      const url = `/docs/${slug}`;
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.topology.primaryClassificationId).toBe(
        MODULE_COMPONENT_CLASSIFICATION_ID,
      );
      expect(document?.facets.primaryClassificationId).toBe(
        MODULE_COMPONENT_CLASSIFICATION_ID,
      );
      expect(document?.topology.primaryClassification?.slug).toBe(
        "concept-module",
      );
    }
  });

  test.each([
    { query: "softmax", url: "/docs/glossary/softmax" },
    { query: "residual connection", url: "/docs/glossary/residual-connection" },
    { query: "embedding", url: "/docs/glossary/embedding" },
  ] as const)("search for %s returns canonical page with module classification context", async ({
    query,
    url,
  }) => {
    const registry = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const documents = buildSearchDocuments(pages, registry);
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => pageBaseUrl(result.url) === url)).toBe(
      true,
    );

    const document = documents.find((entry) => entry.url === url);
    expect(document?.topology.primaryClassificationId).toBe(
      MODULE_COMPONENT_CLASSIFICATION_ID,
    );
  });

  test("temperature keeps softmax prerequisite discoverable from inference pages", async () => {
    const record = getConceptById("concept.temperature");
    expect(record?.prerequisiteIds).toContain("concept.softmax");

    const softmax = getConceptById("concept.softmax");
    expect(softmax?.relatedIds).toContain("concept.temperature");
    expect(softmax?.primaryClassificationId).toBe(
      MODULE_COMPONENT_CLASSIFICATION_ID,
    );
  });

  test("residual and skip connections retain architecture and module related links", async () => {
    const residual = getConceptById("concept.residual-connection");
    expect(residual?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.skip-connection",
        "concept.feed-forward-network",
        "concept.transformer-architecture",
        "concept.normalization",
        "module.attention",
      ]),
    );

    const skip = getConceptById("concept.skip-connection");
    expect(skip?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.residual-connection",
        "concept.normalization",
        "concept.feed-forward-network",
        "concept.transformer-architecture",
      ]),
    );
  });

  test("inference latency glossary pages keep related system serving pages discoverable", async () => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const interTokenLatency = pages.find(
      (page) => page.docsSlug === "glossary/inter-token-latency",
    );
    expect(interTokenLatency).toBeDefined();

    const record = getConceptById("concept.inter-token-latency");
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "system.batching",
        "system.continuous-batching",
        "system.dynamic-batching",
        "system.request-scheduling",
        "system.inference-engine",
      ]),
    );

    const systemsUrls = pages
      .filter((page) => page.docsSlug.startsWith("systems/"))
      .map((page) => page.url);
    for (const url of SYSTEM_INFERENCE_RELATED_URLS) {
      expect(systemsUrls).toContain(url);
    }
  });
});
