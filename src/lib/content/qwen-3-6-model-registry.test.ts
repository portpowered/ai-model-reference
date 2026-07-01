import { describe, expect, test } from "bun:test";
import { resolveCitations } from "@/lib/content/citations";
import { getModelById, listModelRecords } from "@/lib/content/registry-runtime";

const SHARED_CITATION_ID = "citation.qwen36-github";

describe("Qwen 3.6 model registry identities", () => {
  test("registers source-backed dense and MoE operating points with verified slugs", () => {
    const dense = getModelById("model.qwen-3-6-27b");
    const moe = getModelById("model.qwen-3-6-35b-a3b");

    expect(dense).toMatchObject({
      id: "model.qwen-3-6-27b",
      slug: "qwen-3-6-27b",
      aliases: expect.arrayContaining(["Qwen3.6-27B", "Qwen 3.6 27B"]),
      parameterCount: "27 billion parameters",
      contextLength: 262144,
      sourceType: "open-weights",
      family: "qwen",
    });
    expect(moe).toMatchObject({
      id: "model.qwen-3-6-35b-a3b",
      slug: "qwen-3-6-35b-a3b",
      aliases: expect.arrayContaining(["Qwen3.6-35B-A3B", "Qwen 3.6 35B A3B"]),
      parameterCount: "35 billion total parameters",
      activeParameterCount: "3 billion active parameters",
      contextLength: 262144,
      sourceType: "open-weights",
      family: "qwen",
    });
  });

  test("reuses shared Qwen primary-source citations across both model records", () => {
    const dense = getModelById("model.qwen-3-6-27b");
    const moe = getModelById("model.qwen-3-6-35b-a3b");

    if (!dense || !moe) {
      throw new Error("expected both Qwen 3.6 model records in registry");
    }

    expect(dense.citationIds).toContain(SHARED_CITATION_ID);
    expect(moe.citationIds).toContain(SHARED_CITATION_ID);

    const sharedCitations = resolveCitations([SHARED_CITATION_ID]);
    expect(sharedCitations).toHaveLength(1);
    expect(sharedCitations[0]).toMatchObject({
      id: SHARED_CITATION_ID,
      url: "https://github.com/QwenLM/Qwen3.6",
      citationType: "repository",
    });

    const denseCitations = resolveCitations(dense.citationIds);
    const moeCitations = resolveCitations(moe.citationIds);

    expect(denseCitations.map((citation) => citation.id)).toEqual([
      SHARED_CITATION_ID,
      "citation.qwen36-27b-blog",
      "citation.qwen36-27b-huggingface",
    ]);
    expect(moeCitations.map((citation) => citation.id)).toEqual([
      SHARED_CITATION_ID,
      "citation.qwen36-35b-a3b-blog",
      "citation.qwen36-35b-a3b-huggingface",
    ]);
  });

  test("cross-links the dense and MoE operating points through relatedIds", () => {
    const dense = getModelById("model.qwen-3-6-27b");
    const moe = getModelById("model.qwen-3-6-35b-a3b");

    expect(dense?.relatedIds).toContain("model.qwen-3-6-35b-a3b");
    expect(moe?.relatedIds).toContain("model.qwen-3-6-27b");
  });

  test("lists both draft model records in the registry runtime", () => {
    const modelIds = listModelRecords().map((record) => record.id);

    expect(modelIds).toContain("model.qwen-3-6-27b");
    expect(modelIds).toContain("model.qwen-3-6-35b-a3b");
  });
});
