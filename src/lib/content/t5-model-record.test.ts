/**
 * Retained per derived-page-validation policy: reconciled model.t5 registry
 * relationships to current-main module and training records cannot be expressed
 * as derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  getModuleById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";
import { modelRecordSchema } from "./schemas";

const registryRoot = join(import.meta.dir, "../../content/registry");

const REQUIRED_RELATIONSHIP_IDS = [
  "concept.transformer-architecture",
  "concept.encoder-decoder",
  "concept.tokenizers-overview",
  "module.attention",
  "module.t5-relative-position-bias",
  "module.cross-attention",
  "module.multi-head-attention",
  "module.standard-ffn",
  "module.sentencepiece",
  "module.layer-norm",
  "training-regime.pretraining",
  "training-regime.supervised-fine-tuning",
] as const;

describe("t5 model registry record", () => {
  test("registers T5 as a published text encoder-decoder model-family record", async () => {
    const raw = await readFile(join(registryRoot, "models/t5.json"), "utf8");
    const parsed = modelRecordSchema.safeParse(JSON.parse(raw));
    expect(parsed.success).toBe(true);

    const model = parsed.data;
    expect(model?.id).toBe("model.t5");
    expect(model?.slug).toBe("t5");
    expect(model?.kind).toBe("model");
    expect(model?.status).toBe("published");
    expect(model?.family).toBe("t5");
    expect(model?.sourceType).toBe("open-weights");
    expect(model?.modalities).toEqual(["text"]);
    expect(model?.aliases).toEqual(
      expect.arrayContaining([
        "T5",
        "Text-to-Text Transfer Transformer",
        "text-to-text transformer",
        "encoder-decoder T5",
      ]),
    );
    expect(model?.tags).toEqual(
      expect.arrayContaining([
        "model-family",
        "attention",
        "tokenization",
        "position-encoding",
        "feed-forward",
      ]),
    );
    expect(model?.parameterCount).toBe("11 billion parameters (base)");
    expect(model?.contextLength).toBe(512);
    expect(model?.citationIds).toEqual(["citation.raffel-t5"]);
    expect(model?.sourceId).toBe("citation.raffel-t5");
  });

  test("connects T5 to transformer, encoder-decoder, module, and training records", async () => {
    const registry = await loadRegistry();
    const t5 = getModelById("model.t5");

    expect(t5?.architectureIds).toEqual([
      "concept.transformer-architecture",
      "concept.encoder-decoder",
    ]);
    expect(t5?.moduleIds).toEqual([
      "module.sentencepiece",
      "module.t5-relative-position-bias",
      "module.multi-head-attention",
      "module.cross-attention",
      "module.standard-ffn",
      "module.layer-norm",
    ]);
    expect(t5?.trainingRegimeIds).toEqual([
      "training-regime.pretraining",
      "training-regime.supervised-fine-tuning",
    ]);

    for (const relationshipId of REQUIRED_RELATIONSHIP_IDS) {
      expect(t5?.relatedIds, relationshipId).toContain(relationshipId);
      expect(registry.byId.get(relationshipId)?.status, relationshipId).toBe(
        "published",
      );
    }
  });

  test("reverse module and training links list T5 as a published consumer", () => {
    const relativePositionBias = getModuleById(
      "module.t5-relative-position-bias",
    );
    expect(relativePositionBias?.usedByModelIds).toContain("model.t5");
    expect(relativePositionBias?.exampleModelIds).toContain("model.t5");
    expect(relativePositionBias?.relatedIds).toContain("model.t5");

    const pretraining = getTrainingRegimeById("training-regime.pretraining");
    expect(pretraining?.usedByModelIds).toContain("model.t5");
    expect(pretraining?.relatedIds).toContain("model.t5");

    const fineTuning = getTrainingRegimeById(
      "training-regime.supervised-fine-tuning",
    );
    expect(fineTuning?.usedByModelIds).toContain("model.t5");
    expect(fineTuning?.relatedIds).toContain("model.t5");
  });
});
