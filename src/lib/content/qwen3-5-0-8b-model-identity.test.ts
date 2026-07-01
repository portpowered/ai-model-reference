import { describe, expect, test } from "bun:test";
import qwen35Messages from "@/content/docs/models/qwen3-5-0-8b/messages/en.json";
import { resolveCitations } from "@/lib/content/citations";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";

const MODEL_ID = "model.qwen3-5-0-8b";

const QWEN_CONTROLLED_CITATION_IDS = [
  "citation.qwen35-announcement",
  "citation.qwen35-0-8b-huggingface",
  "citation.qwen35-0-8b-base-huggingface",
] as const;

describe("Qwen3.5-0.8B model identity", () => {
  test("publishes the model page at the verified route with matching registry record", () => {
    const model = getModelById(MODEL_ID);
    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);

    expect(model).toMatchObject({
      id: MODEL_ID,
      slug: "qwen3-5-0-8b",
      status: "published",
      parameterCount: "0.8 billion parameters",
      contextLength: 262144,
      modalities: ["text", "image", "video"],
      sourceType: "open-weights",
      family: "qwen",
    });
    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      slug: "qwen3-5-0-8b",
      url: "/docs/models/qwen3-5-0-8b",
    });
  });

  test("registers Qwen-controlled citation records for announcement and both checkpoints", () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected Qwen3.5-0.8B model record in registry");
    }

    expect(model.citationIds).toEqual([...QWEN_CONTROLLED_CITATION_IDS]);

    const citations = resolveCitations(model.citationIds);
    expect(citations.map((citation) => citation.id)).toEqual([
      ...QWEN_CONTROLLED_CITATION_IDS,
    ]);
    expect(citations.map((citation) => citation.url)).toEqual([
      "https://qwen.ai/blog?id=qwen3.5",
      "https://huggingface.co/Qwen/Qwen3.5-0.8B",
      "https://huggingface.co/Qwen/Qwen3.5-0.8B-Base",
    ]);
  });

  test("distinguishes the post-trained checkpoint from the pre-trained base release in page prose", () => {
    expect(qwen35Messages.sections.training.body).toContain(
      "Qwen/Qwen3.5-0.8B-Base",
    );
    expect(qwen35Messages.sections.training.body).toContain("pre-trained-only");
    expect(qwen35Messages.sections.training.body).toContain(
      "Qwen/Qwen3.5-0.8B",
    );
    expect(qwen35Messages.sections.practicalNotes.body).toContain(
      "Qwen/Qwen3.5-0.8B-Base",
    );
  });

  test("grounds identity claims in official source-backed wording", () => {
    expect(qwen35Messages.sections.whatItIs.body).toContain("post-trained");
    expect(qwen35Messages.sections.whatItIs.body).toContain("0.8B");
    expect(qwen35Messages.sections.inputsAndOutputs.body).toContain("262,144");
    expect(qwen35Messages.sections.architecture.body).toContain(
      "Gated DeltaNet",
    );
    expect(qwen35Messages.sections.architecture.body).toContain(
      "Gated Attention",
    );
    expect(qwen35Messages.sections.architecture.body).toContain(
      "vision encoder",
    );
    expect(qwen35Messages.sections.practicalNotes.body).toContain(
      "prototyping",
    );
  });
});
