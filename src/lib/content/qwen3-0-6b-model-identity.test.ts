import { describe, expect, test } from "bun:test";
import { resolveCitations } from "@/lib/content/citations";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import {
  getModelById,
  getOrganizationById,
} from "@/lib/content/registry-runtime";

const MODEL_ID = "model.qwen3-0-6b";
const EXPECTED_CITATION_URLS = [
  "https://qwenlm.github.io/blog/qwen3/",
  "https://huggingface.co/Qwen/Qwen3-0.6B",
  "https://huggingface.co/Qwen/Qwen3-0.6B-Base",
] as const;

describe("Qwen3-0.6B model identity", () => {
  test("registers the model with stable id, slug, and source-backed fields", () => {
    const model = getModelById(MODEL_ID);
    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);

    expect(model).toMatchObject({
      id: MODEL_ID,
      slug: "qwen3-0-6b",
      status: "published",
      aliases: expect.arrayContaining(["Qwen3-0.6B", "Qwen 3 0.6B"]),
      parameterCount: "0.6 billion parameters",
      contextLength: 32768,
      modalities: ["text"],
      sourceType: "open-weights",
      family: "qwen",
      organizationId: "organization.qwen-team",
    });
    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      slug: "qwen3-0-6b",
      url: "/docs/models/qwen3-0-6b",
    });
  });

  test("reuses organization.qwen-team and cites the three Qwen-controlled sources", () => {
    const model = getModelById(MODEL_ID);
    const organization = getOrganizationById("organization.qwen-team");

    if (!model) {
      throw new Error("expected Qwen3-0.6B model record in registry");
    }

    expect(organization?.modelIds).toContain(MODEL_ID);
    expect(model.citationIds).toEqual([
      "citation.qwen3-blog",
      "citation.qwen3-0-6b-huggingface",
      "citation.qwen3-0-6b-base-huggingface",
    ]);

    const citations = resolveCitations(model.citationIds);
    expect(citations.map((citation) => citation.url)).toEqual([
      ...EXPECTED_CITATION_URLS,
    ]);
    expect(new Set(citations.map((citation) => citation.url)).size).toBe(
      EXPECTED_CITATION_URLS.length,
    );
  });

  test("distinguishes the post-trained checkpoint from the base checkpoint in citations", () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected Qwen3-0.6B model record in registry");
    }

    const citations = resolveCitations(model.citationIds);
    const postTrained = citations.find(
      (citation) => citation.url === "https://huggingface.co/Qwen/Qwen3-0.6B",
    );
    const base = citations.find(
      (citation) =>
        citation.url === "https://huggingface.co/Qwen/Qwen3-0.6B-Base",
    );

    expect(postTrained?.id).toBe("citation.qwen3-0-6b-huggingface");
    expect(base?.id).toBe("citation.qwen3-0-6b-base-huggingface");
    expect(postTrained?.id).not.toBe(base?.id);
  });
});
