import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getSystemById,
  listRelatedRegistryRecords,
  listSystemRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("dynamic batching system registry", () => {
  test("establishes the canonical dynamic batching serving identity", () => {
    const record = getSystemById("system.dynamic-batching");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("system");
    expect(record?.slug).toBe("dynamic-batching");
    expect(record?.systemType).toBe("serving");
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "dynamic batching",
      "Dynamic batching",
      "batch window",
      "request batching",
      "queueing delay",
      "utilization tradeoff",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "system.batching",
      "system.continuous-batching",
      "system.routing",
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "system.memory",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
    ]);
    expect(record?.citationIds).toEqual(["citation.orca-serving-system"]);
    expect(listSystemRecords().map((entry) => entry.id)).toContain(
      "system.dynamic-batching",
    );
  });

  test("curated related items resolve to published serving neighbors", () => {
    const source = getSystemById("system.dynamic-batching");
    if (!source) {
      throw new Error("expected system.dynamic-batching in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      items.find((item) => item.registryId === "system.continuous-batching")
        ?.href,
    ).toBe("/docs/systems/continuous-batching");
    expect(
      items.find((item) => item.registryId === "system.routing")?.href,
    ).toBe("/docs/systems/routing");
    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/concepts/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/concepts/kv-cache");
    expect(
      items.find((item) => item.registryId === "system.memory")?.href,
    ).toBe("/docs/systems/memory");
  });
});
