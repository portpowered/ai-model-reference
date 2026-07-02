import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listConceptRecords,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const REGISTRY_ID = "concept.memory-bandwidth";

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
      "concept.kv-cache-quantization",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "system.memory",
      "system.inference-engine",
      "system.batching",
      "system.continuous-batching",
    ]);
    expect(listConceptRecords().map((entry) => entry.id)).toContain(
      REGISTRY_ID,
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(false);
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
      items.find((item) => item.registryId === "concept.kv-cache-quantization")
        ?.href,
    ).toBe("/docs/concepts/kv-cache-quantization");
    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/concepts/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/concepts/prefill-decode-split");
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
});
