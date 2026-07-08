import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getSystemById,
  listRelatedRegistryRecords,
  listSystemRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("gpu system registry", () => {
  test("publishes the canonical GPU system identity with hardware discovery aliases", () => {
    const record = getSystemById("system.gpu");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("system");
    expect(record?.slug).toBe("gpu");
    expect(record?.systemType).toBe("other");
    expect(record?.conceptType).toBe("inference");
    expect(record?.variantGroup).toBe("hardware-distributed");
    expect(record?.aliases).toEqual([
      "GPU",
      "graphics processing unit",
      "AI accelerator",
    ]);
    expect(record?.tags).toEqual(["foundations", "hardware-distributed"]);
    expect(record?.relatedIds).toEqual([
      "concept.memory-bandwidth",
      "concept.roofline-model",
      "concept.quantization",
      "concept.flops",
      "system.inference-engine",
      "system.batching",
      "system.deployment",
      "system.memory",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.memory-bandwidth",
      "concept.roofline-model",
      "concept.quantization",
      "concept.flops",
    ]);
    expect(record?.citationIds).toEqual(["citation.goodfellow-deep-learning"]);
    expect(listSystemRecords().map((entry) => entry.id)).toContain(
      "system.gpu",
    );
  });

  test("curated related items resolve to shipped serving and concept neighbors", () => {
    const source = getSystemById("system.gpu");
    if (!source) {
      throw new Error("expected system.gpu in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.memory-bandwidth")
        ?.href,
    ).toBe("/docs/concepts/memory-bandwidth");
    expect(
      items.find((item) => item.registryId === "concept.roofline-model")?.href,
    ).toBe("/docs/concepts/roofline-model");
    expect(
      items.find((item) => item.registryId === "concept.quantization")?.href,
    ).toBe("/docs/concepts/quantization");
    expect(
      items.find((item) => item.registryId === "concept.flops")?.href,
    ).toBe("/docs/concepts/flops");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      items.find((item) => item.registryId === "system.deployment")?.href,
    ).toBe("/docs/systems/deployment");
    expect(
      items.find((item) => item.registryId === "system.memory")?.href,
    ).toBe("/docs/systems/memory");
  });
});
