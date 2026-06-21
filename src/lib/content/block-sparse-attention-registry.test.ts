import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("block-sparse attention registry slice (block-sparse-attention-module-page-001)", () => {
  test("publishes the block-sparse attention module with attention-family discovery metadata", async () => {
    const registry = await loadRegistry();
    const record = registry.byId.get("module.block-sparse-attention");

    expect(record).toBeDefined();
    expect(record?.kind).toBe("module");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("block-sparse-attention");
    expect(record?.tags).toEqual(["attention", "context-window"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "block-sparse attention",
        "block sparse attention",
        "block-sparse self-attention",
        "structured sparse attention",
      ]),
    );
    expect(record?.citationIds).toEqual([
      "citation.sparse-transformers",
      "citation.longformer",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.sparse-attention",
      "module.sliding-window-attention",
      "concept.context-window",
      "concept.why-long-context-is-hard",
    ]);

    if (record?.kind !== "module") {
      throw new Error("expected module.block-sparse-attention module record");
    }

    expect(record.moduleType).toBe("attention");
    expect(record.moduleFamily).toBe("attention");
    expect(record.conceptType).toBe("attention-variant");
    expect(record.variantGroup).toBe("sparse-patterns");
  });

  test("curated related docs connect block-sparse attention to shipped nearby attention and long-context pages", async () => {
    const registry = await loadRegistry();
    const source = registry.byId.get("module.block-sparse-attention");

    if (source?.kind !== "module") {
      throw new Error("expected module.block-sparse-attention module record");
    }

    const items = deriveCuratedRelatedItems(
      source,
      Array.from(registry.byId.values()).filter(
        (record) =>
          record.kind !== "tag" &&
          record.kind !== "citation" &&
          record.kind !== "graph",
      ),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "module.sparse-attention")?.href,
    ).toBe("/docs/modules/sparse-attention");
    expect(
      items.find(
        (item) => item.registryId === "module.sliding-window-attention",
      )?.href,
    ).toBe("/docs/modules/sliding-window-attention");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find(
        (item) => item.registryId === "concept.why-long-context-is-hard",
      )?.href,
    ).toBe("/docs/concepts/why-long-context-is-hard");
  });
});
