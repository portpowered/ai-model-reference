import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("visual-tokenization concept discovery (visual-tokenization-concept-page-001)", () => {
  test("registry record stays published with visual-token aliases, tokenization tags, and focused related ids", () => {
    const record = getConceptById("concept.visual-tokenization");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Visual tokenization",
      "visual tokenization",
      "image tokenization",
      "video tokenization",
      "visual tokens",
      "patch tokens",
      "discrete visual codes",
      "latent visual tokens",
    ]);
    expect(record?.tags).toEqual(["tokenization", "foundations", "taxonomy"]);
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.architecture",
    );
    expect(record?.prerequisiteIds).toEqual([
      "concept.modality",
      "concept.representation",
      "concept.patch",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.clip-image-tokenization",
      "concept.tokenizers-overview",
      "concept.autoregressive-generation",
      "concept.diffusion-model",
      "model.ltx-23",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.image-is-worth-16x16-words",
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
      "citation.neural-discrete-representation-learning",
      "citation.latent-diffusion-models",
      "citation.ltx-2-efficient-joint-audio-visual-foundation-model",
    ]);
    expect(record?.explainsIds).toEqual(["module.clip-image-tokenization"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.visual-tokenization")).toBe(
      false,
    );
  });

  test("curated related links point to CLIP, tokenization, generation, diffusion, and video paths", () => {
    const source = getConceptById("concept.visual-tokenization");
    if (!source) {
      throw new Error("expected concept.visual-tokenization in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.clip-image-tokenization")
        ?.href,
    ).toBe("/docs/modules/clip-image-tokenization");
    expect(
      items.find((item) => item.registryId === "concept.tokenizers-overview")
        ?.href,
    ).toBe("/docs/concepts/tokenizers-overview");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(items.find((item) => item.registryId === "model.ltx-23")?.href).toBe(
      "/docs/models/ltx-23",
    );
  });
});
