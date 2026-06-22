import { describe, expect, test } from "bun:test";
import {
  getGraphById,
  listGraphRecords,
} from "@/lib/content/graph-registry-runtime";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getSystemById,
  listRelatedRegistryRecords,
  listSystemRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("memory system registry", () => {
  test("publishes the canonical memory system identity with serving-memory aliases", () => {
    const record = getSystemById("system.memory");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("system");
    expect(record?.slug).toBe("memory");
    expect(record?.systemType).toBe("memory");
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "memory",
      "serving memory",
      "weight residency",
      "KV cache growth",
      "memory bandwidth",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache", "context-window"]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.kv-cache",
      "system.batching",
      "system.continuous-batching",
      "system.speculative-decoding",
      "system.routing",
      "system.inference-engine",
      "system.deployment",
      "system.on-disk-kv-cache",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.kv-cache",
    ]);
    expect(listSystemRecords().map((entry) => entry.id)).toContain(
      "system.memory",
    );
  });

  test("curated related items resolve to already-published serving and glossary neighbors", () => {
    const source = getSystemById("system.memory");
    if (!source) {
      throw new Error("expected system.memory in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/glossary/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/glossary/prefill-decode-split");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/concepts/kv-cache");
    expect(
      items.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      items.find((item) => item.registryId === "system.continuous-batching")
        ?.href,
    ).toBe("/docs/systems/continuous-batching");
    expect(
      items.find((item) => item.registryId === "system.speculative-decoding")
        ?.href,
    ).toBe("/docs/systems/speculative-decoding");
    expect(
      items.find((item) => item.registryId === "system.routing")?.href,
    ).toBe("/docs/systems/routing");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "system.deployment")?.href,
    ).toBe("/docs/systems/deployment");
    expect(
      items.find((item) => item.registryId === "system.on-disk-kv-cache")?.href,
    ).toBe("/docs/systems/on-disk-kv-cache");
  });

  test("ships a graph-backed system flow record for the memory page bundle", () => {
    const graph = getGraphById("graph.memory-system-flow");

    expect(graph?.subjectId).toBe("system.memory");
    expect(graph?.rootNodeId).toBe("weights");
    expect(graph?.nodes.map((node) => node.id)).toEqual([
      "weights",
      "prefill",
      "kv-cache",
      "decode",
      "pressure",
    ]);
    expect(graph?.edges.map((edge) => edge.id)).toEqual([
      "weights-prefill",
      "prefill-kv-cache",
      "prefill-decode",
      "kv-cache-pressure",
      "decode-pressure",
    ]);
    expect(listGraphRecords().map((entry) => entry.id)).toContain(
      "graph.memory-system-flow",
    );
  });
});
