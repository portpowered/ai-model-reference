import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getCitationById,
  getModelById,
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { citationRecordSchema, modelRecordSchema } from "@/lib/content/schemas";
import { validateRegistryContent } from "@/lib/content/validate-registry";

const registryRoot = join(import.meta.dir, "../../content/registry");

describe("stable-diffusion model registry (stable-diffusion-model-page-001)", () => {
  test("model and citation JSON records pass schema validation", async () => {
    const modelRaw = await readFile(
      join(registryRoot, "models/stable-diffusion.json"),
      "utf8",
    );
    const citationRaw = await readFile(
      join(
        registryRoot,
        "citations/high-resolution-image-synthesis-with-latent-diffusion-models.json",
      ),
      "utf8",
    );

    const model = modelRecordSchema.parse(JSON.parse(modelRaw));
    const citation = citationRecordSchema.parse(JSON.parse(citationRaw));

    expect(model.id).toBe("model.stable-diffusion");
    expect(model.slug).toBe("stable-diffusion");
    expect(model.kind).toBe("model");
    expect(model.status).toBe("published");
    expect(model.family).toBe("stable-diffusion");
    expect(model.modalities).toEqual(["image"]);
    expect(model.tags).toContain("model-family");
    expect(model.aliases).toContain("Stable Diffusion");
    expect(model.aliases).toContain("text to image diffusion");
    expect(model.citationIds).toContain(
      "citation.high-resolution-image-synthesis-with-latent-diffusion-models",
    );
    expect(model.citationIds).toContain(
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
    );
    expect(model.sourceId).toBe(
      "citation.high-resolution-image-synthesis-with-latent-diffusion-models",
    );
    expect(citation.id).toBe(
      "citation.high-resolution-image-synthesis-with-latent-diffusion-models",
    );
  });

  test("registry validation accepts stable-diffusion backing records", async () => {
    const errors = await validateRegistryContent();
    const stableDiffusionErrors = errors.filter((error) =>
      error.message.includes("model.stable-diffusion"),
    );

    expect(stableDiffusionErrors).toEqual([]);
  });

  test("runtime resolves stable-diffusion with adjacent concept relationships", () => {
    const model = getModelById("model.stable-diffusion");
    if (!model) {
      throw new Error("expected model.stable-diffusion in registry runtime");
    }

    expect(model.architectureIds).toEqual(
      expect.arrayContaining([
        "concept.diffusion-model",
        "concept.denoising-generation",
        "concept.latent-space",
        "concept.latent",
        "concept.conditioning",
      ]),
    );
    expect(model.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.diffusion-model",
        "concept.denoising-generation",
        "concept.latent-space",
        "concept.conditioning",
        "concept.loss-function",
      ]),
    );

    for (const relatedId of model.relatedIds) {
      expect(getRegistryRecordById(relatedId)).toBeDefined();
    }
    for (const citationId of model.citationIds) {
      expect(getCitationById(citationId)).toBeDefined();
    }
  });

  test("curated related docs surface shipped adjacent glossary targets", () => {
    const source = getRegistryRecordById("model.stable-diffusion");
    if (!source) {
      throw new Error("expected model.stable-diffusion in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    const hrefs = items
      .filter((item) => item.href)
      .map((item) => item.href as string);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/docs/glossary/diffusion-model",
        "/docs/glossary/denoising-generation",
        "/docs/glossary/latent-space",
        "/docs/glossary/latent",
        "/docs/glossary/conditioning",
        "/docs/glossary/loss-function",
      ]),
    );
  });
});
