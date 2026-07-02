/**
 * Retained per derived-page-validation policy: reconciled model.ltx-23 registry
 * relationships to current-main concept, module, paper, and citation ids cannot
 * be expressed as derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { loadRegistry } from "@/lib/content/registry";
import { getModelById } from "@/lib/content/registry-runtime";

describe("ltx-23 model registry record", () => {
  test("registers LTX-2.3 as a published open-weight video and audio model with required aliases", () => {
    const ltx23 = getModelById("model.ltx-23");

    expect(ltx23).toBeDefined();
    expect(ltx23?.kind).toBe("model");
    expect(ltx23?.slug).toBe("ltx-23");
    expect(ltx23?.family).toBe("ltx");
    expect(ltx23?.status).toBe("published");
    expect(ltx23?.sourceType).toBe("open-weights");
    expect(ltx23?.modalities).toEqual(
      expect.arrayContaining(["text", "image", "audio", "video", "multimodal"]),
    );
    expect(ltx23?.aliases).toEqual(
      expect.arrayContaining([
        "LTX-2.3",
        "LTX 2.3",
        "LTX-23",
        "ltx-23",
        "LTX Video 2.3",
        "LTXV 2.3",
        "audio video diffusion model",
      ]),
    );
    expect(ltx23?.citationIds).toEqual(
      expect.arrayContaining([
        "citation.ltx-2-3-huggingface",
        "citation.ltx-2-3-model-page",
        "citation.ltx-2-efficient-joint-audio-visual-foundation-model",
        "citation.ltx-2-repository",
      ]),
    );
  });

  test("connects LTX-2.3 to diffusion, latent, multimodal, conditioning, and transformer concepts", async () => {
    const registry = await loadRegistry();
    const ltx23 = getModelById("model.ltx-23");

    const requiredRelatedIds = [
      "concept.diffusion-model",
      "concept.denoising-generation",
      "concept.latent-space",
      "concept.multimodal-model",
      "concept.conditioning",
      "concept.modality",
      "concept.transformer-architecture",
      "concept.encoder",
      "concept.decoder",
      "paper.latent-diffusion",
      "paper.ltx-2",
      "module.cross-attention",
      "training-regime.diffusion-training-objective",
    ];

    expect(ltx23?.relatedIds).toEqual(
      expect.arrayContaining(requiredRelatedIds),
    );
    expect(ltx23?.architectureIds).toEqual(
      expect.arrayContaining([
        "concept.diffusion-model",
        "concept.denoising-generation",
        "concept.latent-space",
        "concept.multimodal-model",
        "concept.transformer-architecture",
        "concept.conditioning",
      ]),
    );
    expect(ltx23?.paperIds).toEqual(
      expect.arrayContaining(["paper.ltx-2", "paper.latent-diffusion"]),
    );

    for (const relatedId of requiredRelatedIds) {
      expect(registry.byId.get(relatedId)?.status, relatedId).toBe("published");
    }
  });

  test("does not invent a variational-autoencoder link before that concept exists", async () => {
    const registry = await loadRegistry();
    const ltx23 = getModelById("model.ltx-23");
    const variationalAutoencoder = registry.bySlug.get(
      "variational-autoencoder",
    );

    expect(variationalAutoencoder).toBeUndefined();
    expect(
      ltx23?.relatedIds.some((relatedId) =>
        relatedId.includes("variational-autoencoder"),
      ),
    ).toBe(false);
  });
});
