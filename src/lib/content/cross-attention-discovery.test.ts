import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("cross-attention discovery wiring", () => {
  test("cross-attention derives nearby published related docs in registry order", () => {
    const source = getModuleById("module.cross-attention");
    if (!source) {
      throw new Error("expected module.cross-attention in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.bidirectional-attention",
      "concept.transformer-architecture",
      "concept.encoder-decoder",
      "concept.multimodal-model",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/modules/attention",
      "/docs/modules/multi-head-attention",
      "/docs/modules/bidirectional-attention",
      "/docs/concepts/transformer-architecture",
      "/docs/glossary/encoder-decoder",
      "/docs/glossary/multimodal-model",
    ]);
    expect(items.every((item) => item.isPlanned === false)).toBe(true);
  });
});
