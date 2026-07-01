import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getCitationById,
  getModelById,
  getOrganizationById,
  getPaperById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";
import { modelRecordSchema } from "./schemas";

const registryRoot = join(import.meta.dir, "../../content/registry");

const REQUIRED_RELATIONSHIP_IDS = [
  "concept.transformer-architecture",
  "concept.autoregressive-generation",
  "module.attention",
  "module.rope",
  "concept.context-window",
  "training-regime.pretraining",
  "concept.alignment",
] as const;

describe("llama-3 model registry backing", () => {
  test("model.llama-3 JSON passes modelRecordSchema with canonical discovery metadata", async () => {
    const raw = await readFile(
      join(registryRoot, "models/llama-3.json"),
      "utf8",
    );
    const parsed = modelRecordSchema.safeParse(JSON.parse(raw));
    expect(parsed.success).toBe(true);

    const model = parsed.data;
    expect(model?.id).toBe("model.llama-3");
    expect(model?.slug).toBe("llama-3");
    expect(model?.kind).toBe("model");
    expect(model?.status).toBe("published");
    expect(model?.family).toBe("llama");
    expect(model?.sourceType).toBe("open-weights");
    expect(model?.modalities).toEqual(["text"]);
    expect(model?.aliases).toEqual([
      "Llama 3",
      "Meta Llama 3",
      "Llama 3.1",
      "Llama 3 405B",
      "Llama 3 128K",
    ]);
    expect(model?.contextLength).toBe(131072);
    expect(model?.parameterCount).toBe("405 billion parameters");
    expect(model?.organizationId).toBe("organization.meta");
    expect(model?.paperIds).toEqual(["paper.llama-3"]);
    expect(model?.sourceId).toBe("citation.llama-3-herd-of-models");
    expect(model?.citationIds).toEqual([
      "citation.llama-3-herd-of-models",
      "citation.llama-3-meta-release",
    ]);
  });

  test("registry runtime resolves llama-3 model, paper, organization, and citations", () => {
    const model = getModelById("model.llama-3");
    expect(model?.slug).toBe("llama-3");
    expect(model?.tags).toContain("model-family");
    expect(model?.architectureIds).toEqual([
      "concept.transformer-architecture",
      "concept.autoregressive-generation",
    ]);
    expect(model?.moduleIds).toEqual([
      "module.grouped-query-attention",
      "module.rope",
      "module.rmsnorm",
      "module.swiglu",
      "module.causal-attention",
    ]);
    expect(model?.trainingRegimeIds).toEqual(["training-regime.pretraining"]);

    const paper = getPaperById("paper.llama-3");
    expect(paper?.modelIds).toEqual(["model.llama-3"]);
    expect(paper?.citationIds).toContain("citation.llama-3-herd-of-models");
    expect(paper?.arxivId).toBe("2407.21783");

    const organization = getOrganizationById("organization.meta");
    expect(organization?.modelIds).toEqual(["model.llama-3"]);
    expect(organization?.paperIds).toEqual(["paper.llama-3"]);

    const paperCitation = getCitationById("citation.llama-3-herd-of-models");
    expect(paperCitation?.title).toBe("The Llama 3 Herd of Models");
    expect(paperCitation?.url).toBe("https://arxiv.org/abs/2407.21783");

    const releaseCitation = getCitationById("citation.llama-3-meta-release");
    expect(releaseCitation?.url).toBe("https://llama.meta.com");
  });

  test("model.llama-3 links to transformer, attention, RoPE, context, and training concepts", () => {
    const model = getModelById("model.llama-3");
    expect(model).toBeDefined();

    for (const relationshipId of REQUIRED_RELATIONSHIP_IDS) {
      expect(model?.relatedIds).toContain(relationshipId);
    }

    expect(model?.relatedIds).toContain("concept.decoder");
    expect(model?.relatedIds).toContain("concept.context-extension");
  });

  test("pretraining training regime lists llama-3 as a published consumer", () => {
    const pretraining = getTrainingRegimeById("training-regime.pretraining");
    expect(pretraining?.usedByModelIds).toContain("model.llama-3");
    expect(pretraining?.relatedIds).toContain("model.llama-3");
  });
});
