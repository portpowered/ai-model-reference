import { describe, expect, test } from "bun:test";
import {
  getModelById,
  getRegistryRecordById,
  getRegistryTags,
} from "@/lib/content/registry-runtime";

describe("gpt-2 model registry record", () => {
  test("registers GPT-2 as a first-class GPT family model with required discovery aliases", () => {
    const record = getModelById("model.gpt-2");

    expect(record?.slug).toBe("gpt-2");
    expect(record?.kind).toBe("model");
    expect(record?.family).toBe("gpt");
    expect(record?.sourceType).toBe("open-weights");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "GPT-2",
        "Generative Pre-trained Transformer 2",
        "gpt2",
      ]),
    );
    expect(getRegistryTags("model.gpt-2")).toEqual([
      "foundations",
      "model-family",
      "attention",
      "tokenization",
    ]);
  });

  test("links GPT-2 to its canonical architecture and module records", () => {
    const record = getModelById("model.gpt-2");

    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.tokenizers-overview",
      "module.byte-level-tokenization",
      "module.learned-positional-embeddings",
      "module.multi-head-attention",
      "module.feed-forward-network",
    ]);
    expect(record?.architectureIds).toEqual([
      "concept.transformer-architecture",
    ]);
    expect(record?.moduleIds).toEqual([
      "module.byte-level-tokenization",
      "module.learned-positional-embeddings",
      "module.multi-head-attention",
      "module.feed-forward-network",
    ]);
    expect(record?.citationIds).toEqual(["citation.gpt-2-report"]);
    expect(record?.sourceId).toBe("citation.gpt-2-report");
  });

  test("only exposes pretraining and GPT-2 paper links when canonical registry records exist", () => {
    const record = getModelById("model.gpt-2");
    const pretraining = getRegistryRecordById("training-regime.pretraining");
    const gpt2Paper = getRegistryRecordById("paper.gpt-2-report");

    if (pretraining) {
      expect(record?.trainingRegimeIds).toContain(pretraining.id);
    } else {
      expect(record?.trainingRegimeIds).not.toContain(
        "training-regime.pretraining",
      );
    }

    if (gpt2Paper) {
      expect(record?.paperIds).toContain(gpt2Paper.id);
    } else {
      expect(record?.paperIds).not.toContain("paper.gpt-2-report");
    }
  });
});
