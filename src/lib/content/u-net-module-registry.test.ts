import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import {
  citationRecordSchema,
  moduleRecordSchema,
} from "@/lib/content/schemas";

describe("u-net module registry slice (u-net-module-page-001)", () => {
  test("publishes module.u-net with canonical discovery metadata", async () => {
    const indexes = await loadRegistry();
    const record = indexes.byId.get("module.u-net");
    const parsed = moduleRecordSchema.safeParse(record);

    expect(parsed.success).toBe(true);
    expect(record?.kind).toBe("module");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("u-net");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.tags).toEqual(["foundations", "model-family"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "U-Net",
        "UNet",
        "U Net",
        "diffusion U-Net",
        "image denoising backbone",
      ]),
    );
    expect(record?.citationIds).toEqual([
      "citation.u-net-convolutional-networks",
      "citation.denoising-diffusion-probabilistic-models",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.denoising-generation",
      "training-regime.diffusion-training-objective",
      "concept.conditioning",
      "concept.latent-space",
      "paper.latent-diffusion",
      "module.diffusion-transformer-block",
      "citation.denoising-diffusion-probabilistic-models",
    ]);

    if (record?.kind !== "module") {
      throw new Error("expected module.u-net module record");
    }

    expect(record.moduleType).toBe("other");
    expect(record.moduleFamily).toBe("denoising-backbone");
    expect(record.conceptType).toBe("architecture");
    expect(record.variantGroup).toBe("diffusion-denoising-blocks");
    expect(record.primaryClassificationId).toBe("classification.module");
    expect(record.sourceId).toBe("citation.u-net-convolutional-networks");
    expect(record.releaseDate).toBe("2015-05-18");
  });

  test("registers U-Net and DDPM citations backing the module", () => {
    const uNetCitation = getCitationById(
      "citation.u-net-convolutional-networks",
    );
    const uNetParsed = citationRecordSchema.safeParse(uNetCitation);

    expect(uNetParsed.success).toBe(true);
    expect(uNetCitation?.status).toBe("published");
    expect(uNetCitation?.url).toBe("https://arxiv.org/abs/1505.04597");
    expect(uNetCitation?.year).toBe(2015);
    expect(uNetCitation?.aliases).toEqual(
      expect.arrayContaining([
        "U-Net paper",
        "U-Net architecture paper",
        "Convolutional Networks for Biomedical Image Segmentation",
      ]),
    );

    const ddpmCitation = getCitationById(
      "citation.denoising-diffusion-probabilistic-models",
    );
    const ddpmParsed = citationRecordSchema.safeParse(ddpmCitation);

    expect(ddpmParsed.success).toBe(true);
    expect(ddpmCitation?.status).toBe("published");
  });

  test("does not invent a Stable Diffusion related link before that model exists", async () => {
    const registry = await loadRegistry();
    const record = registry.byId.get("module.u-net");
    const stableDiffusion = registry.bySlug.get("stable-diffusion");

    expect(stableDiffusion).toBeUndefined();
    expect(
      record?.relatedIds.some((relatedId) =>
        relatedId.includes("stable-diffusion"),
      ),
    ).toBe(false);
  });

  test("curated related docs connect U-Net to shipped diffusion and denoising pages", () => {
    const source = getModuleById("module.u-net");

    if (!source) {
      throw new Error("expected module.u-net in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.denoising-generation")
        ?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(
      items.find(
        (item) =>
          item.registryId === "training-regime.diffusion-training-objective",
      )?.href,
    ).toBe("/docs/training/diffusion-training-objective");
    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(
      items.find((item) => item.registryId === "concept.latent-space")?.href,
    ).toBe("/docs/concepts/latent-space");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find(
        (item) => item.registryId === "module.diffusion-transformer-block",
      )?.href,
    ).toBe("/docs/modules/diffusion-transformer-block");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("module.u-net")).toBe(true);
  });
});
