import { describe, expect, test } from "bun:test";
import { loadRegistry } from "@/lib/content/registry";
import { getModelById } from "@/lib/content/registry-runtime";

describe("clip model registry record", () => {
  test("registers CLIP as a published model-family record with required aliases", () => {
    const clip = getModelById("model.clip");

    expect(clip).toBeDefined();
    expect(clip?.kind).toBe("model");
    expect(clip?.slug).toBe("clip");
    expect(clip?.family).toBe("clip");
    expect(clip?.status).toBe("published");
    expect(clip?.aliases).toEqual(
      expect.arrayContaining([
        "CLIP",
        "Contrastive Language-Image Pre-training",
        "text-image encoder",
      ]),
    );
    expect(clip?.citationIds).toContain(
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
    );
  });

  test("connects CLIP to the required published concept records", async () => {
    const registry = await loadRegistry();
    const clip = getModelById("model.clip");

    const requiredRelatedIds = [
      "concept.conditioning",
      "concept.encoder",
      "concept.patch",
      "concept.multimodal-model",
    ];

    expect(clip?.relatedIds).toEqual(
      expect.arrayContaining(requiredRelatedIds),
    );

    for (const relatedId of requiredRelatedIds) {
      expect(registry.byId.get(relatedId)?.status, relatedId).toBe("published");
    }
  });

  test("does not invent a Stable Diffusion related link before that model exists", async () => {
    const registry = await loadRegistry();
    const clip = getModelById("model.clip");
    const stableDiffusion = registry.bySlug.get("stable-diffusion");

    expect(stableDiffusion).toBeUndefined();
    expect(
      clip?.relatedIds.some((relatedId) =>
        relatedId.includes("stable-diffusion"),
      ),
    ).toBe(false);
  });
});
