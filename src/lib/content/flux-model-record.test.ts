/**
 * Retained per derived-page-validation policy: reconciled model.flux registry
 * relationships to current-main concept, module, and paper ids cannot be
 * expressed as derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { loadRegistry } from "@/lib/content/registry";
import { getModelById } from "@/lib/content/registry-runtime";

describe("flux model registry record", () => {
  test("registers Flux as a published image-generation model-family record with required aliases", () => {
    const flux = getModelById("model.flux");

    expect(flux).toBeDefined();
    expect(flux?.kind).toBe("model");
    expect(flux?.slug).toBe("flux");
    expect(flux?.family).toBe("flux");
    expect(flux?.status).toBe("published");
    expect(flux?.modalities).toEqual(
      expect.arrayContaining(["text", "image", "multimodal"]),
    );
    expect(flux?.aliases).toEqual(
      expect.arrayContaining([
        "Flux",
        "FLUX.1",
        "FLUX.2",
        "Black Forest Labs Flux",
        "BFL Flux",
        "text-to-image Flux",
      ]),
    );
    expect(flux?.citationIds).toEqual(
      expect.arrayContaining([
        "citation.flux-bfl-announcement",
        "citation.flux-github-repository",
        "citation.flux-1-dev-huggingface",
        "citation.flux-2-github-repository",
      ]),
    );
    expect(flux?.releaseDate).toBe("2024-08-01");
  });

  test("connects Flux to shipped diffusion, transformer, conditioning, and CLIP records", async () => {
    const registry = await loadRegistry();
    const flux = getModelById("model.flux");

    const requiredRelatedIds = [
      "concept.diffusion-model",
      "concept.denoising-generation",
      "concept.latent-space",
      "concept.classifier-free-guidance",
      "concept.text-to-image-conditioning",
      "concept.transformer-architecture",
      "concept.flow-matching",
      "model.clip",
      "module.diffusion-transformer-block",
      "paper.latent-diffusion",
      "paper.diffusion-transformers",
      "training-regime.diffusion-training-objective",
    ];

    expect(flux?.relatedIds).toEqual(
      expect.arrayContaining(requiredRelatedIds),
    );
    expect(flux?.moduleIds).toContain("module.diffusion-transformer-block");
    expect(flux?.paperIds).toEqual(
      expect.arrayContaining([
        "paper.latent-diffusion",
        "paper.diffusion-transformers",
      ]),
    );

    for (const relatedId of requiredRelatedIds) {
      expect(registry.byId.get(relatedId)?.status, relatedId).toBe("published");
    }
  });

  test("does not invent unsupported parameter metadata or Stable Diffusion links", async () => {
    const registry = await loadRegistry();
    const flux = getModelById("model.flux");
    const stableDiffusion = registry.bySlug.get("stable-diffusion");

    expect(stableDiffusion).toBeUndefined();
    expect(flux?.parameterCount).toBeUndefined();
    expect(flux?.activeParameterCount).toBeUndefined();
    expect(
      flux?.relatedIds.some((relatedId) =>
        relatedId.includes("stable-diffusion"),
      ),
    ).toBe(false);
  });
});
