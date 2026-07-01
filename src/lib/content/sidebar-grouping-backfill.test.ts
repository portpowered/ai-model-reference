import { describe, expect, test } from "bun:test";
import {
  getConceptById,
  getModuleById,
  getSystemById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";

const GLOSSARY_SIDEBAR_BACKFILLS = [
  ["concept.embedding", "math-and-training"],
  ["concept.context-window", "sequence-and-attention"],
  ["concept.decoder", "sequence-and-attention"],
  ["concept.decode", "sequence-and-attention"],
  ["concept.encoder", "sequence-and-attention"],
  ["concept.encoder-decoder", "sequence-and-attention"],
  ["concept.hidden-size", "sequence-and-attention"],
  ["concept.kv-cache", "sequence-and-attention"],
  ["concept.normalization", "sequence-and-attention"],
  ["concept.prefill", "sequence-and-attention"],
  ["concept.prefill-decode-split", "sequence-and-attention"],
  ["concept.perplexity", "sequence-and-attention"],
  ["concept.residual-connection", "sequence-and-attention"],
  ["concept.skip-connection", "sequence-and-attention"],
  ["concept.token", "sequence-and-attention"],
  ["concept.transformer", "sequence-and-attention"],
  ["concept.autoregressive-generation", "generation-and-diffusion"],
  ["concept.greedy-decoding", "generation-and-diffusion"],
  ["concept.sampling-overview", "generation-and-diffusion"],
  ["concept.top-k-sampling", "generation-and-diffusion"],
  ["concept.top-p-sampling", "generation-and-diffusion"],
  ["concept.conditioning", "generation-and-diffusion"],
  ["concept.denoising-generation", "generation-and-diffusion"],
  ["concept.diffusion-model", "generation-and-diffusion"],
] as const;

const CONCEPT_SIDEBAR_BACKFILLS = [
  ["concept.context-extension", "long-context"],
  ["concept.positional-encodings", "long-context"],
  ["concept.why-long-context-is-hard", "long-context"],
  ["concept.page-spec-workflow-sample", "reference-samples"],
] as const;

const MODULE_SIDEBAR_BACKFILLS = [
  ["module.attention", "attention-foundations"],
  ["module.manifold-constrained-hyper-connections", "attention-variants"],
] as const;

const TRAINING_SIDEBAR_OVERRIDES = [
  ["training-regime.distillation", "distillation"],
  ["training-regime.on-policy-distillation", "distillation"],
  ["training-regime.specialist-training", "post-training"],
  ["training-regime.fp4-quantization-aware-training", "optimization"],
] as const;

describe("sidebar grouping backfill", () => {
  test("records from slug-driven glossary groups now carry explicit registry metadata", () => {
    for (const [recordId, expectedGroup] of GLOSSARY_SIDEBAR_BACKFILLS) {
      expect(getConceptById(recordId)?.sidebarGrouping?.glossary).toBe(
        expectedGroup,
      );
    }
  });

  test("records from slug-driven concept and module groups now carry explicit registry metadata", () => {
    for (const [recordId, expectedGroup] of CONCEPT_SIDEBAR_BACKFILLS) {
      expect(getConceptById(recordId)?.sidebarGrouping?.concepts).toBe(
        expectedGroup,
      );
    }

    for (const [recordId, expectedGroup] of MODULE_SIDEBAR_BACKFILLS) {
      expect(getModuleById(recordId)?.sidebarGrouping?.modules).toBe(
        expectedGroup,
      );
    }
  });

  test("training keeps intentional editorial overrides where ontology detail is still incomplete", () => {
    for (const [recordId, expectedGroup] of TRAINING_SIDEBAR_OVERRIDES) {
      expect(getTrainingRegimeById(recordId)?.sidebarGrouping?.training).toBe(
        expectedGroup,
      );
    }
  });

  test("ontology-derived groups stay free of redundant sidebar overrides where the classification already resolves placement", () => {
    expect(
      getConceptById("concept.activation")?.sidebarGrouping,
    ).toBeUndefined();
    expect(
      getConceptById("concept.calibration")?.sidebarGrouping,
    ).toBeUndefined();
    expect(
      getConceptById("concept.tokenizers-overview")?.sidebarGrouping?.concepts,
    ).toBe(undefined);
    expect(
      getConceptById("concept.top-p-sampling")?.sidebarGrouping?.concepts,
    ).toBe(undefined);
    expect(
      getConceptById("concept.transformer-architecture")?.sidebarGrouping,
    ).toBeUndefined();
    expect(
      getModuleById("module.grouped-query-attention")?.sidebarGrouping,
    ).toBe(undefined);
    expect(
      getModuleById("module.multi-head-attention")?.sidebarGrouping,
    ).toBeUndefined();
    expect(
      getTrainingRegimeById("training-regime.dpo")?.sidebarGrouping,
    ).toBeUndefined();
    expect(getSystemById("system.routing")?.sidebarGrouping).toBeUndefined();
    expect(
      getSystemById("system.on-disk-kv-cache")?.sidebarGrouping,
    ).toBeUndefined();
    expect(
      getSystemById("system.expert-parallel-overlap")?.sidebarGrouping,
    ).toBeUndefined();
  });

  test("serving systems stay derivable without redundant sidebar overrides", () => {
    const batching = getSystemById("system.batching");

    expect(batching?.systemType).toBe("serving");
    expect(batching?.sidebarGrouping).toBeUndefined();
  });
});
