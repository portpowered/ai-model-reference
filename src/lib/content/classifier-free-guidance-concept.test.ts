import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("classifier-free-guidance concept discovery", () => {
  test("registry record stays published with guidance aliases, generation tags, and focused related ids", () => {
    const record = getConceptById("concept.classifier-free-guidance");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual([
      "Classifier-Free Guidance",
      "classifier-free guidance",
      "CFG",
      "diffusion guidance",
      "prompt guidance scale",
      "guidance scale",
    ]);
    expect(record?.tags).toEqual(["foundations", "taxonomy"]);
    expect(record?.conceptType).toBe("inference");
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.inference",
    );
    expect(record?.prerequisiteIds).toEqual([
      "concept.conditioning",
      "concept.denoising-generation",
      "concept.diffusion-model",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.conditioning",
      "concept.diffusion-model",
      "concept.denoising-generation",
      "model.clip",
      "paper.latent-diffusion",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.classifier-free-guidance"),
    ).toBe(false);
  });

  test("curated related links point to diffusion generation foundations", () => {
    const source = getConceptById("concept.classifier-free-guidance");
    if (!source) {
      throw new Error("expected concept.classifier-free-guidance in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find((item) => item.registryId === "concept.denoising-generation")
        ?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(items.find((item) => item.registryId === "model.clip")?.href).toBe(
      "/docs/models/clip",
    );
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(items.some((item) => item.registryId === "module.attention")).toBe(
      false,
    );
    expect(
      items.some((item) => item.registryId === "concept.transformer"),
    ).toBe(false);
  });
});
