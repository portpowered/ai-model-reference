import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { listRelatedRegistryRecords } from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("mamba selective state-space registry slice (MAMBA-001)", () => {
  test("publishes the Mamba module with state-space taxonomy and discovery metadata", async () => {
    const registry = await loadRegistry();
    const record = registry.byId.get("module.mamba-selective-state-space");

    expect(record).toBeDefined();
    expect(record?.kind).toBe("module");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("mamba-selective-state-space");
    expect(record?.tags).toEqual(["state-space", "context-window"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "Mamba",
        "Mamba block",
        "selective state space model",
        "selective SSM",
        "state-space module",
        "SSM",
      ]),
    );
    expect(record?.citationIds).toEqual([
      "citation.mamba-selective-state-space-paper",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.linear-attention",
      "concept.context-window",
      "concept.transformer-architecture",
      "concept.why-long-context-is-hard",
      "model.nemotron-3-super",
    ]);

    if (record?.kind !== "module") {
      throw new Error(
        "expected module.mamba-selective-state-space module record",
      );
    }

    expect(record.moduleType).toBe("state-space");
    expect(record.moduleFamily).toBe("state-space");
    expect(record.conceptType).toBe("state-space-variant");
    expect(record.variantGroup).toBe("selective-state-space");
    expect(record.primaryClassificationId).toBe(
      "classification.module.state-space",
    );
    expect(record.exampleModelIds).toEqual(["model.nemotron-3-super"]);
    expect(record.usedByModelIds).toEqual(["model.nemotron-3-super"]);
  });

  test("state-space tag and classification records resolve for taxonomy-backed discovery", async () => {
    const registry = await loadRegistry();
    const tag = registry.byId.get("tag.state-space");
    const classification = registry.byId.get(
      "classification.module.state-space",
    );

    expect(tag?.kind).toBe("tag");
    expect(tag?.status).toBe("published");
    expect(tag?.aliases).toEqual(
      expect.arrayContaining(["SSM", "selective state space"]),
    );

    expect(classification?.kind).toBe("classification");
    expect(classification?.status).toBe("published");
    if (classification?.kind !== "classification") {
      throw new Error("expected classification.module.state-space record");
    }
    expect(classification.parentClassificationId).toBe("classification.module");
    expect(classification.classifiesKinds).toEqual(["module"]);
  });

  test("curated related docs connect Mamba to shipped attention, long-context, and hybrid-model pages", async () => {
    const registry = await loadRegistry();
    const source = registry.byId.get("module.mamba-selective-state-space");

    if (source?.kind !== "module") {
      throw new Error(
        "expected module.mamba-selective-state-space module record",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "module.linear-attention")?.href,
    ).toBe("/docs/modules/linear-attention");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find(
        (item) => item.registryId === "concept.why-long-context-is-hard",
      )?.href,
    ).toBe("/docs/concepts/why-long-context-is-hard");
    expect(
      items.find((item) => item.registryId === "model.nemotron-3-super")?.href,
    ).toBe("/docs/models/nemotron-3-super");
  });
});
