import { describe, expect, test } from "bun:test";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import {
  getCitationById,
  getModelById,
  getOrganizationById,
  getPaperById,
  getRegistryRecordById,
  listModelRecords,
} from "@/lib/content/registry-runtime";
import { validateRegistryContent } from "@/lib/content/validate-registry";

describe("GLM family shared registry records", () => {
  test("registry validation passes for the shared GLM slice", async () => {
    const errors = await validateRegistryContent();
    const glmErrors = errors.filter((error) =>
      /glm-5|organization\.zai|paper\.glm-5/.test(error.message),
    );
    expect(glmErrors).toEqual([]);
  });

  test("organization, paper, citations, and models resolve through the runtime", () => {
    expect(getOrganizationById("organization.zai")?.modelIds).toEqual([
      "model.glm-5",
      "model.glm-5-2",
    ]);
    expect(getPaperById("paper.glm-5")?.modelIds).toEqual([
      "model.glm-5",
      "model.glm-5-2",
    ]);
    expect(getCitationById("citation.glm-5-technical-report")?.url).toBe(
      "https://arxiv.org/abs/2602.15763",
    );
    expect(getCitationById("citation.glm-5-2-blog")?.url).toBe(
      "https://huggingface.co/blog/zai-org/glm-52-blog",
    );
    expect(getModelById("model.glm-5")?.releaseDate).toBe("2026-02-17");
    expect(getModelById("model.glm-5-2")?.releaseDate).toBe("2026-06-17");
  });

  test("both models share family metadata and cross-link without duplicating source URLs", () => {
    const glm5 = getModelById("model.glm-5");
    const glm52 = getModelById("model.glm-5-2");

    expect(glm5?.family).toBe("glm");
    expect(glm52?.family).toBe("glm");
    expect(glm5?.organizationId).toBe("organization.zai");
    expect(glm52?.organizationId).toBe("organization.zai");
    expect(glm5?.paperIds).toEqual(["paper.glm-5"]);
    expect(glm52?.paperIds).toEqual(["paper.glm-5"]);
    expect(glm5?.relatedIds).toContain("model.glm-5-2");
    expect(glm52?.relatedIds).toContain("model.glm-5");
    expect(glm5?.sourceId).toBe("citation.glm-5-technical-report");
    expect(glm52?.sourceId).toBe("citation.glm-5-2-blog");
    expect(glm52?.parameterCount).toBe("744 billion total parameters");
    expect(glm52?.activeParameterCount).toBe("40 billion active parameters");
    expect(glm5?.citationIds).toEqual(["citation.glm-5-technical-report"]);
    expect(glm52?.citationIds).toEqual([
      "citation.glm-5-technical-report",
      "citation.glm-5-2-blog",
    ]);
  });

  test("architecture graphs bind to each model and reuse shared citations", () => {
    const glm5Graph = getGraphById("graph.glm-5-architecture");
    const glm52Graph = getGraphById("graph.glm-5-2-architecture");

    expect(glm5Graph?.subjectId).toBe("model.glm-5");
    expect(glm52Graph?.subjectId).toBe("model.glm-5-2");
    expect(glm5Graph?.citationIds).toEqual(["citation.glm-5-technical-report"]);
    expect(glm52Graph?.citationIds).toEqual(["citation.glm-5-2-blog"]);
    expect(
      glm5Graph?.nodes.some(
        (node) => node.registryId === "module.sparse-attention",
      ),
    ).toBe(true);
    expect(
      glm52Graph?.nodes.some(
        (node) => node.registryId === "module.mixture-of-experts",
      ),
    ).toBe(true);
  });

  test("GLM models stay separately addressable in the model registry list", () => {
    const glmModelIds = listModelRecords()
      .filter((record) => record.family === "glm")
      .map((record) => record.id)
      .sort();

    expect(glmModelIds).toEqual(["model.glm-5", "model.glm-5-2"]);
    expect(getRegistryRecordById("model.glm-5")?.slug).toBe("glm-5");
    expect(getRegistryRecordById("model.glm-5-2")?.slug).toBe("glm-5-2");
  });
});
