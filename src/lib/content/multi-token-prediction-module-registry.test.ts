import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import {
  citationRecordSchema,
  moduleRecordSchema,
} from "@/lib/content/schemas";

describe("multi-token-prediction module registry slice (multi-token-prediction-001)", () => {
  test("publishes module.multi-token-prediction with canonical discovery metadata", async () => {
    const indexes = await loadRegistry();
    const record = indexes.byId.get("module.multi-token-prediction");
    const parsed = moduleRecordSchema.safeParse(record);

    expect(parsed.success).toBe(true);
    expect(record?.kind).toBe("module");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("multi-token-prediction");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "multi-token prediction",
        "multitoken prediction",
        "MTP",
        "N-token prediction",
        "multiple future tokens",
        "predict multiple future tokens",
        "Better & Faster Large Language Models via Multi-token Prediction",
      ]),
    );
    expect(record?.citationIds).toEqual([
      "citation.multi-token-prediction-paper",
    ]);
    expect(record?.relatedIds).toEqual([
      "training-regime.pretraining",
      "concept.autoregressive-generation",
      "system.speculative-decoding",
      "concept.decoder",
      "concept.transformer-architecture",
    ]);

    if (record?.kind !== "module") {
      throw new Error("expected module.multi-token-prediction module record");
    }

    expect(record.moduleType).toBe("training-method");
    expect(record.moduleFamily).toBe("training-objective");
    expect(record.conceptType).toBe("training");
    expect(record.variantGroup).toBe("language-model-objectives");
    expect(record.primaryClassificationId).toBe("classification.module");
    expect(record.sourceId).toBe("citation.multi-token-prediction-paper");
    expect(record.releaseDate).toBe("2024-04-30");
  });

  test("registers the arXiv:2404.19737 citation backing the module", () => {
    const citation = getCitationById("citation.multi-token-prediction-paper");
    const parsed = citationRecordSchema.safeParse(citation);

    expect(parsed.success).toBe(true);
    expect(citation?.status).toBe("published");
    expect(citation?.url).toBe("https://arxiv.org/abs/2404.19737");
    expect(citation?.year).toBe(2024);
    expect(citation?.aliases).toEqual(
      expect.arrayContaining([
        "2404.19737",
        "Better & Faster Large Language Models via Multi-token Prediction",
      ]),
    );
  });

  test("curated related docs connect multi-token prediction to shipped nearby training and inference pages", () => {
    const source = getModuleById("module.multi-token-prediction");

    if (!source) {
      throw new Error(
        "expected module.multi-token-prediction in registry runtime",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "training-regime.pretraining")
        ?.href,
    ).toBe("/docs/training/pretraining");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "system.speculative-decoding")
        ?.href,
    ).toBe("/docs/systems/speculative-decoding");
    expect(
      items.find((item) => item.registryId === "concept.decoder")?.href,
    ).toBe("/docs/glossary/decoder");
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
  });
});
