import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import {
  getDocsPageDir,
  MEMORY_BANDWIDTH_CONCEPT_PAGE_DIR,
} from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listConceptRecords,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.memory-bandwidth";
const SLUG = "memory-bandwidth";
const CONCEPT_URL = "/docs/concepts/memory-bandwidth";
const pageDir = getDocsPageDir("concepts", SLUG);
const messagesPath = join(pageDir, "messages/en.json");

describe("memory-bandwidth concept discovery (memory-bandwidth-concept-page-001)", () => {
  test("registry record is published with serving aliases, inference classification, and focused related ids", () => {
    const record = getConceptById(REGISTRY_ID);

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("memory-bandwidth");
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.inference",
    );
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "memory bandwidth",
      "serving memory bandwidth",
      "inference memory bandwidth",
      "KV cache bandwidth",
      "weight bandwidth",
      "throughput ceiling",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache", "quantization"]);
    expect(record?.prerequisiteIds).toEqual([
      "concept.kv-cache",
      "concept.quantization",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.kv-cache",
      "concept.quantization",
      "concept.weight-only-quantization",
      "concept.activation-quantization",
      "concept.kv-cache-quantization",
      "system.memory",
      "system.inference-engine",
      "system.batching",
      "system.continuous-batching",
    ]);
    expect(listConceptRecords().map((entry) => entry.id)).toContain(
      REGISTRY_ID,
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("curated related links resolve to published serving neighbors without competing system identity", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.memory-bandwidth in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/concepts/kv-cache");
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
    expect(
      items.find((item) => item.registryId === "system.memory")?.href,
    ).toBe("/docs/systems/memory");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      items.find((item) => item.registryId === "system.continuous-batching")
        ?.href,
    ).toBe("/docs/systems/continuous-batching");
  });

  test("system.memory no longer claims the memory bandwidth alias while linking to the concept record", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const memoryDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/memory",
    );

    expect(memoryDocument?.aliases).toEqual(
      expect.arrayContaining([
        "serving memory",
        "weight residency",
        "KV cache growth",
      ]),
    );
    expect(memoryDocument?.aliases).not.toContain("memory bandwidth");
    expect(memoryDocument?.relatedIds).toContain(REGISTRY_ID);
  });

  test("search index records memory bandwidth with aliases and serving tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "memory bandwidth",
        "serving memory bandwidth",
        "KV cache bandwidth",
        "throughput ceiling",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "kv-cache", "quantization"]),
    );
  });

  test("search finds memory bandwidth by title and aliases", async () => {
    for (const query of [
      "memory bandwidth",
      "serving memory bandwidth",
      "KV cache bandwidth",
      "throughput ceiling",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });
});

describe("memory-bandwidth concept page (memory-bandwidth-concept-page-002)", () => {
  test("messages define byte movement in isolation before neighboring topics", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Memory bandwidth");
    expect(messages.openingSummary?.toLowerCase()).toContain(
      "bytes can move between memory and compute",
    );
    expect(messages.openingSummary?.toLowerCase()).toContain("model serving");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "transfer bytes",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "movement rate",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "throughput ceiling",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "weight bytes",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "memory capacity",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "benchmark",
    );
  });

  test("page bundle resolves from content path and renders sections, tags, and related links", async () => {
    expect(MEMORY_BANDWIDTH_CONCEPT_PAGE_DIR).toBe(pageDir);

    const page = await loadConceptPage(SLUG);

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const pages = await loadPublishedDocsPages("en");
    const publishedPage = pages.find((entry) => entry.pageDir === pageDir);
    expect(publishedPage?.url).toBe(CONCEPT_URL);

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
    expect(html).toContain("movement rate");
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('href="/tags/quantization"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-message");
  });
});

describe("memory-bandwidth byte movement teaching (memory-bandwidth-concept-page-003)", () => {
  test("messages teach weights, activations, KV cache movement and throughput ceiling", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.sections?.whichBytesMove.body?.toLowerCase()).toContain(
      "model weights",
    );
    expect(messages.sections?.whichBytesMove.body?.toLowerCase()).toContain(
      "intermediate activations",
    );
    expect(messages.sections?.whichBytesMove.body?.toLowerCase()).toContain(
      "kv cache",
    );
    expect(messages.sections?.whichBytesMove.body?.toLowerCase()).toContain(
      "decode",
    );
    expect(messages.sections?.throughputCeiling.body?.toLowerCase()).toContain(
      "tokens per second",
    );
    expect(messages.sections?.throughputCeiling.body).toContain(
      "B_{\\mathrm{avail}}",
    );
    expect(messages.sections?.computeVsBandwidth.body?.toLowerCase()).toContain(
      "compute-bound",
    );
    expect(messages.sections?.computeVsBandwidth.body?.toLowerCase()).toContain(
      "bandwidth-bound",
    );
    expect(messages.sections?.servingPhases.body?.toLowerCase()).toContain(
      "prefill",
    );
    expect(messages.sections?.servingPhases.body?.toLowerCase()).toContain(
      "decode",
    );
    expect(messages.sections?.servingPhases.body?.toLowerCase()).toContain(
      "batching",
    );
    expect(messages.sections?.servingPhases.body?.toLowerCase()).toContain(
      "longer context",
    );
  });

  test("rendered page exposes byte-movement sections with throughput ceiling math", async () => {
    const page = await loadConceptPage(SLUG);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('id="which-bytes-move"');
    expect(html).toContain('id="throughput-ceiling"');
    expect(html).toContain('id="compute-vs-bandwidth"');
    expect(html).toContain('id="serving-phases"');
    expect(html).toContain('href="/docs/concepts/activation"');
    expect(html).toContain("compute-bound");
    expect(html).toContain("bandwidth-bound");
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain("katex");
    expect(html).not.toContain("missing-message");
  });
});

describe("memory-bandwidth compression neighbors (memory-bandwidth-concept-page-004)", () => {
  test("messages connect quantization and KV cache compression to bandwidth without vendor claims", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(
      messages.sections?.quantizationAndBandwidth.body?.toLowerCase(),
    ).toContain("weight-only quantization");
    expect(
      messages.sections?.quantizationAndBandwidth.body?.toLowerCase(),
    ).toContain("activation quantization");
    expect(
      messages.sections?.quantizationAndBandwidth.body?.toLowerCase(),
    ).toContain("kv cache quantization");
    expect(
      messages.sections?.quantizationAndBandwidth.body?.toLowerCase(),
    ).toContain("bandwidth-bound");
    expect(
      messages.sections?.quantizationAndBandwidth.body?.toLowerCase(),
    ).toContain("does not automatically double");
    expect(messages.sections?.kvCacheCompression.body?.toLowerCase()).toContain(
      "kv cache compression",
    );
    expect(messages.sections?.kvCacheCompression.body?.toLowerCase()).toContain(
      "general model quantization",
    );
    expect(messages.sections?.kvCacheCompression.body?.toLowerCase()).toContain(
      "long context",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "benchmark",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "hardware purchases",
    );
  });

  test("rendered page links compression neighbors and keeps system.memory as a systems neighbor", async () => {
    const page = await loadConceptPage(SLUG);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('id="quantization-and-bandwidth"');
    expect(html).toContain('id="kv-cache-compression"');
    expect(html).toContain('href="/docs/concepts/weight-only-quantization"');
    expect(html).toContain('href="/docs/concepts/activation-quantization"');
    expect(html).toContain('href="/docs/concepts/kv-cache-quantization"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).not.toContain("missing-message");
  });
});
