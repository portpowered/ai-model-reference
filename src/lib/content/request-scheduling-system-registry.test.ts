import { describe, expect, test } from "bun:test";
import { resolveCitations } from "@/lib/content/citations";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getSystemById,
  listRelatedRegistryRecords,
  listSystemRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("request scheduling system registry", () => {
  test("publishes the canonical request scheduling identity with discovery aliases", () => {
    const record = getSystemById("system.request-scheduling");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("system");
    expect(record?.slug).toBe("request-scheduling");
    expect(record?.systemType).toBe("serving");
    expect(record?.conceptType).toBe("inference");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "scheduler",
      "request scheduling",
      "queueing",
      "admission control",
      "fairness",
      "latency",
      "throughput",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "system.batching",
      "system.continuous-batching",
      "system.routing",
      "system.memory",
      "system.deployment",
      "system.inference-engine",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
    ]);
    expect(record?.citationIds).toEqual(["citation.orca-serving-system"]);
    expect(listSystemRecords().map((entry) => entry.id)).toContain(
      "system.request-scheduling",
    );
  });

  test("resolves the Orca serving citation for release metadata", () => {
    const record = getSystemById("system.request-scheduling");
    if (!record) {
      throw new Error("expected system.request-scheduling in registry");
    }

    const citations = resolveCitations(record.citationIds);

    expect(citations.map((entry) => entry.id)).toEqual([
      "citation.orca-serving-system",
    ]);
    expect(record.sourceId).toBe("citation.orca-serving-system");
  });

  test("curated related items resolve to published serving and generation-stage neighbors", () => {
    const source = getSystemById("system.request-scheduling");
    if (!source) {
      throw new Error("expected system.request-scheduling in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/concepts/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/glossary/prefill-decode-split");
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
      items.find((item) => item.registryId === "system.memory")?.href,
    ).toBe("/docs/systems/memory");
    expect(
      items.find((item) => item.registryId === "system.deployment")?.href,
    ).toBe("/docs/systems/deployment");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
  });
});
