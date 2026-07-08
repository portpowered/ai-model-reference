import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCitationById, getModelById } from "@/lib/content/registry-runtime";
import { modelRecordSchema } from "./schemas";

const registryRoot = join(import.meta.dir, "../../content/registry");

const REQUIRED_RELATIONSHIP_IDS = [
  "concept.encoder-decoder",
  "concept.tokenizers-overview",
  "concept.multimodal-model",
] as const;

const REQUIRED_ALIASES = [
  "Whisper",
  "OpenAI Whisper",
  "speech recognition",
  "automatic speech recognition",
  "speech translation",
] as const;

describe("whisper model registry backing (whisper-model-page-current-main-002)", () => {
  test("model.whisper JSON passes modelRecordSchema with canonical discovery metadata", async () => {
    const raw = await readFile(
      join(registryRoot, "models/whisper.json"),
      "utf8",
    );
    const parsed = modelRecordSchema.safeParse(JSON.parse(raw));
    expect(parsed.success).toBe(true);

    const model = parsed.data;
    expect(model?.id).toBe("model.whisper");
    expect(model?.slug).toBe("whisper");
    expect(model?.kind).toBe("model");
    expect(model?.status).toBe("published");
    expect(model?.family).toBe("whisper");
    expect(model?.sourceType).toBe("open-weights");
    expect(model?.modalities).toEqual(["audio", "text", "multimodal"]);
    expect(model?.aliases).toEqual([...REQUIRED_ALIASES]);
    expect(model?.sourceId).toBe("citation.whisper-robust-speech-recognition");
    expect(model?.citationIds).toEqual([
      "citation.whisper-robust-speech-recognition",
      "citation.whisper-repository",
      "citation.whisper-large-huggingface",
    ]);
  });

  test("registry runtime resolves whisper model and primary-source citations", () => {
    const model = getModelById("model.whisper");
    expect(model?.slug).toBe("whisper");
    expect(model?.tags).toContain("model-family");
    expect(model?.architectureIds).toEqual([
      "concept.encoder-decoder",
      "concept.transformer-architecture",
      "concept.multimodal-model",
    ]);
    expect(model?.moduleIds).toEqual([
      "module.cross-attention",
      "module.multi-head-attention",
      "module.bpe",
      "module.layer-norm",
    ]);

    const paperCitation = getCitationById(
      "citation.whisper-robust-speech-recognition",
    );
    expect(paperCitation?.title).toBe(
      "Robust Speech Recognition via Large-Scale Weak Supervision",
    );
    expect(paperCitation?.url).toBe("https://arxiv.org/abs/2212.04356");

    const repositoryCitation = getCitationById("citation.whisper-repository");
    expect(repositoryCitation?.url).toBe("https://github.com/openai/whisper");

    const modelCardCitation = getCitationById(
      "citation.whisper-large-huggingface",
    );
    expect(modelCardCitation?.url).toBe(
      "https://huggingface.co/openai/whisper-large-v3",
    );
  });

  test("model.whisper links to encoder-decoder, tokenization, and multimodal concepts", () => {
    const model = getModelById("model.whisper");
    expect(model).toBeDefined();

    for (const relationshipId of REQUIRED_RELATIONSHIP_IDS) {
      expect(model?.relatedIds).toContain(relationshipId);
    }

    expect(model?.relatedIds).toContain("concept.modality");
    expect(model?.relatedIds).toContain("module.cross-attention");
  });
});
