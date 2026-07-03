import { describe, expect, test } from "bun:test";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("video-generation concept discovery (video-generation-concept-page-001)", () => {
  test("registry record is published with generation aliases, modality tags, and focused related ids", () => {
    const record = getConceptById("concept.video-generation");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("video-generation");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "video generation",
      "text to video",
      "text-to-video",
      "generated video",
      "video synthesis",
      "temporal consistency",
      "visual token generation",
    ]);
    expect(record?.tags).toEqual(["taxonomy", "foundations", "model-family"]);
    expect(record?.conceptType).toBe("general");
    expect(record?.sidebarGrouping?.concepts).toBe("architecture");
    expect(record?.prerequisiteIds).toEqual([
      "concept.generative-model",
      "concept.modality",
      "concept.diffusion-model",
      "concept.autoregressive-generation",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.diffusion-model",
      "concept.autoregressive-generation",
      "concept.conditioning",
      "concept.generative-model",
      "concept.modality",
      "model.ltx-23",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.ltx-2-efficient-joint-audio-visual-foundation-model",
      "citation.denoising-diffusion-probabilistic-models",
    ]);
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.video-generation"),
    ).toBe(false);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.video-generation")).toBe(
      false,
    );
  });

  test("curated related links resolve only to existing diffusion, autoregressive, and video model or paper targets", () => {
    const source = getConceptById("concept.video-generation");
    if (!source) {
      throw new Error("expected concept.video-generation in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(items.find((item) => item.registryId === "model.ltx-23")?.href).toBe(
      "/docs/models/ltx-23",
    );
    expect(
      items.some((item) => item.registryId === "concept.visual-tokenization"),
    ).toBe(false);
    expect(items.some((item) => item.registryId === "paper.ltx-2")).toBe(false);
  });

  test("related ids resolve to published registry records", async () => {
    const indexes = await loadRegistry();
    const record = getConceptById("concept.video-generation");

    for (const relatedId of record?.relatedIds ?? []) {
      expect(indexes.byId.has(relatedId)).toBe(true);
    }
  });
});
