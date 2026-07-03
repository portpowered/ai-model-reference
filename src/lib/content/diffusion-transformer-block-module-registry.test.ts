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

describe("diffusion transformer block module registry slice (diffusion-transformer-block-module-001)", () => {
  test("publishes module.diffusion-transformer-block with canonical discovery metadata", async () => {
    const indexes = await loadRegistry();
    const record = indexes.byId.get("module.diffusion-transformer-block");
    const parsed = moduleRecordSchema.safeParse(record);

    expect(parsed.success).toBe(true);
    expect(record?.kind).toBe("module");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("diffusion-transformer-block");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.tags).toEqual(["foundations", "model-family"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "diffusion transformer block",
        "DiT block",
        "diffusion transformer",
        "timestep conditioned transformer block",
        "patch denoising transformer",
      ]),
    );
    expect(record?.citationIds).toEqual([
      "citation.scalable-diffusion-models-with-transformers",
      "citation.denoising-diffusion-probabilistic-models",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.self-attention",
      "module.attention",
      "module.feed-forward-network",
      "concept.denoising-generation",
      "training-regime.diffusion-training-objective",
      "concept.latent-space",
      "concept.conditioning",
      "concept.patch",
      "paper.diffusion-transformers",
      "paper.latent-diffusion",
      "citation.image-is-worth-16x16-words",
    ]);

    if (record?.kind !== "module") {
      throw new Error(
        "expected module.diffusion-transformer-block module record",
      );
    }

    expect(record.moduleType).toBe("other");
    expect(record.moduleFamily).toBe("transformer-block");
    expect(record.conceptType).toBe("architecture");
    expect(record.variantGroup).toBe("diffusion-denoising-blocks");
    expect(record.primaryClassificationId).toBe(
      "classification.module.transformer-block",
    );
    expect(record.sourceId).toBe(
      "citation.scalable-diffusion-models-with-transformers",
    );
    expect(record.introducedByPaperIds).toEqual([
      "paper.diffusion-transformers",
    ]);
    expect(record.releaseDate).toBe("2022-12-19");
  });

  test("registers DiT and DDPM citations backing the module", () => {
    const ditCitation = getCitationById(
      "citation.scalable-diffusion-models-with-transformers",
    );
    const ditParsed = citationRecordSchema.safeParse(ditCitation);

    expect(ditParsed.success).toBe(true);
    expect(ditCitation?.status).toBe("published");
    expect(ditCitation?.url).toBe("https://arxiv.org/abs/2212.09748");
    expect(ditCitation?.year).toBe(2022);
    expect(ditCitation?.aliases).toEqual(
      expect.arrayContaining([
        "DiT paper",
        "Diffusion Transformers paper",
        "Scalable Diffusion Models with Transformers",
      ]),
    );

    const ddpmCitation = getCitationById(
      "citation.denoising-diffusion-probabilistic-models",
    );
    const ddpmParsed = citationRecordSchema.safeParse(ddpmCitation);

    expect(ddpmParsed.success).toBe(true);
    expect(ddpmCitation?.status).toBe("published");
  });

  test("curated related docs connect diffusion transformer block to shipped nearby pages", () => {
    const source = getModuleById("module.diffusion-transformer-block");

    if (!source) {
      throw new Error(
        "expected module.diffusion-transformer-block in registry runtime",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.self-attention")?.href,
    ).toBe("/docs/concepts/self-attention");
    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "module.feed-forward-network")
        ?.href,
    ).toBe("/docs/modules/feed-forward-network");
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
      items.find((item) => item.registryId === "concept.latent-space")?.href,
    ).toBe("/docs/concepts/latent-space");
    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(
      items.find((item) => item.registryId === "concept.patch")?.href,
    ).toBe("/docs/glossary/patch");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("module.diffusion-transformer-block"),
    ).toBe(true);
  });
});
