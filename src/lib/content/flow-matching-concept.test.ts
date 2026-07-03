import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getCitationById,
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

const REGISTRY_ID = "concept.flow-matching";

const EXPECTED_RELATED_IDS = [
  "training-regime.diffusion-training-objective",
  "paper.latent-diffusion",
  "module.diffusion-transformer-block",
  "model.ltx-23",
] as const;

describe("flow matching concept discovery (flow-matching-concept-page-001)", () => {
  test("registry record stays published with flow-matching aliases, objective tags, and focused related ids", () => {
    const record = getConceptById(REGISTRY_ID);
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("flow-matching");
    expect(record?.aliases).toEqual([
      "Flow matching",
      "flow matching",
      "rectified flow",
      "velocity prediction",
      "flow-matching objective",
    ]);
    expect(record?.tags).toEqual(["foundations", "model-family"]);
    expect(record?.conceptType).toBe("training");
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.training",
    );
    expect(record?.prerequisiteIds).toEqual([
      "concept.generative-model",
      "concept.denoising-generation",
      "training-regime.diffusion-training-objective",
    ]);
    expect(record?.relatedIds).toEqual([...EXPECTED_RELATED_IDS]);
    expect(record?.citationIds).toEqual([
      "citation.flow-matching-for-generative-modeling",
      "citation.rectified-flow",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(false);
  });

  test("citation records resolve for flow matching objective claims", () => {
    const flowMatchingPaper = getCitationById(
      "citation.flow-matching-for-generative-modeling",
    );
    expect(flowMatchingPaper?.status).toBe("published");
    expect(flowMatchingPaper?.title).toBe(
      "Flow Matching for Generative Modeling",
    );

    const rectifiedFlowPaper = getCitationById("citation.rectified-flow");
    expect(rectifiedFlowPaper?.status).toBe("published");
    expect(rectifiedFlowPaper?.aliases).toEqual(
      expect.arrayContaining(["Rectified Flow", "rectified flow paper"]),
    );
  });

  test("curated related links resolve only to existing adjacent diffusion and video targets", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.flow-matching in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) =>
          item.registryId === "training-regime.diffusion-training-objective",
      )?.href,
    ).toBe("/docs/training/diffusion-training-objective");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find(
        (item) => item.registryId === "module.diffusion-transformer-block",
      )?.href,
    ).toBe("/docs/modules/diffusion-transformer-block");
    expect(items.find((item) => item.registryId === "model.ltx-23")?.href).toBe(
      "/docs/models/ltx-23",
    );
    expect(items.some((item) => item.registryId.includes("cosmos"))).toBe(
      false,
    );
    expect(
      items.some((item) => item.registryId.includes("video-generation")),
    ).toBe(false);
  });
});
