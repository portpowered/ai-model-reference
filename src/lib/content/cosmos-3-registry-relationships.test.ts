import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  getModelById,
  getOrganizationById,
  getPaperById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { validateRegistryContent } from "./validate-registry";

const MODEL_ID = "model.cosmos-3";

const VERIFIED_ALIASES = [
  "NVIDIA Cosmos 3",
  "Cosmos3",
  "Cosmos 3 Super",
  "Cosmos 3 Nano",
  "omnimodal world model",
  "physical AI world model",
] as const;

const TOUCHED_RECORD_IDS = [
  MODEL_ID,
  "paper.cosmos-3",
  "organization.nvidia",
  "concept.world-model",
  "concept.multimodal-model",
  "concept.autoregressive-generation",
  "concept.denoising-generation",
  "concept.diffusion-model",
  "concept.conditioning",
] as const;

describe("cosmos 3 registry relationships", () => {
  test("model record publishes source-backed omnimodal world-model metadata", () => {
    const model = getModelById(MODEL_ID);

    expect(model?.status).toBe("published");
    expect(model?.slug).toBe("cosmos-3");
    expect(model?.organizationId).toBe("organization.nvidia");
    expect(model?.paperIds).toEqual(["paper.cosmos-3"]);
    expect(model?.family).toBe("cosmos");
    expect(model?.sourceType).toBe("open-weights");
    expect(model?.modalities).toEqual(
      expect.arrayContaining(["text", "image", "video", "audio", "multimodal"]),
    );
    expect(model?.parameterCount).toBe(
      "16B Nano and 64B Super family variants",
    );
    expect(model?.releaseDate).toBe("2026-05-31");
    expect(model?.architectureIds).toEqual([
      "concept.world-model",
      "concept.multimodal-model",
      "concept.autoregressive-generation",
      "concept.denoising-generation",
      "concept.diffusion-model",
      "concept.conditioning",
    ]);
    expect(model?.tags).toEqual(["foundations", "model-family"]);
    for (const alias of VERIFIED_ALIASES) {
      expect(model?.aliases).toContain(alias);
    }
    expect(model?.relatedIds).toEqual([
      "paper.cosmos-3",
      "organization.nvidia",
      "concept.world-model",
      "concept.multimodal-model",
      "concept.autoregressive-generation",
      "concept.denoising-generation",
      "concept.diffusion-model",
      "concept.conditioning",
    ]);
    expect(model?.relatedIds).not.toContain("concept.flow-matching");
  });

  test("supporting records link back to the Cosmos 3 model family", () => {
    expect(getPaperById("paper.cosmos-3")?.relatedIds).toEqual([MODEL_ID]);
    expect(getPaperById("paper.cosmos-3")?.modelIds).toEqual([MODEL_ID]);
    expect(getOrganizationById("organization.nvidia")?.modelIds).toContain(
      MODEL_ID,
    );
    expect(getOrganizationById("organization.nvidia")?.paperIds).toContain(
      "paper.cosmos-3",
    );
    expect(getConceptById("concept.world-model")?.relatedIds).toContain(
      MODEL_ID,
    );
    expect(getConceptById("concept.multimodal-model")?.relatedIds).toContain(
      MODEL_ID,
    );
    expect(
      getConceptById("concept.autoregressive-generation")?.relatedIds,
    ).toContain(MODEL_ID);
    expect(
      getConceptById("concept.denoising-generation")?.relatedIds,
    ).toContain(MODEL_ID);
    expect(getConceptById("concept.diffusion-model")?.relatedIds).toContain(
      MODEL_ID,
    );
    expect(getConceptById("concept.conditioning")?.relatedIds).toContain(
      MODEL_ID,
    );
  });

  test("curated related items resolve to published world-model and generation concept pages", () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.cosmos-3 in registry");
    }

    const items = deriveCuratedRelatedItems(
      model,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.world-model")?.href,
    ).toBe("/docs/glossary/world-model");
    expect(
      items.find((item) => item.registryId === "concept.multimodal-model")
        ?.href,
    ).toBe("/docs/glossary/multimodal-model");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "concept.denoising-generation")
        ?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
  });

  test("registry validation passes for the Cosmos 3 relationship slice", async () => {
    const issues = await validateRegistryContent();
    const touchedIssues = issues.filter((issue) =>
      TOUCHED_RECORD_IDS.some((recordId) => issue.message.includes(recordId)),
    );

    expect(touchedIssues).toEqual([]);
  });
});
