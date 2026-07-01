import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getSystemById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("inference engine system registry", () => {
  test("publishes runtime-focused aliases and nearby serving relationships", () => {
    const record = getSystemById("system.inference-engine");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("system");
    expect(record?.systemType).toBe("runtime");
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "inference engine",
      "model runtime",
      "serving engine",
      "LLM inference engine",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache", "quantization"]);
    expect(record?.relatedIds).toEqual([
      "concept.kv-cache",
      "concept.quantization",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "system.speculative-decoding",
      "system.batching",
      "system.on-disk-kv-cache",
      "system.expert-parallel-overlap",
      "model.gpt-3",
      "model.deepseek-v4-pro",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.kv-cache",
      "concept.quantization",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
    ]);
    expect(record?.relatedModelIds).toEqual([
      "model.gpt-3",
      "model.deepseek-v4-pro",
    ]);
  });

  test("curated related items resolve to shipped serving and model pages", () => {
    const source = getSystemById("system.inference-engine");
    if (!source) {
      throw new Error("expected system.inference-engine in registry");
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
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/concepts/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/concepts/decode");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/glossary/prefill-decode-split");
    expect(
      items.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      items.find((item) => item.registryId === "system.speculative-decoding")
        ?.href,
    ).toBe("/docs/systems/speculative-decoding");
    expect(
      items.find((item) => item.registryId === "system.on-disk-kv-cache")?.href,
    ).toBe("/docs/systems/on-disk-kv-cache");
    expect(
      items.find((item) => item.registryId === "system.expert-parallel-overlap")
        ?.href,
    ).toBe("/docs/systems/expert-parallel-overlap");
    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
    expect(
      items.find((item) => item.registryId === "model.deepseek-v4-pro")?.href,
    ).toBe("/docs/models/deepseek-v4-pro");
  });
});
