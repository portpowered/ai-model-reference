import { describe, expect, test } from "bun:test";
import { resolveCitations } from "@/lib/content/citations";
import {
  getCitationById,
  getModelById,
  getOrganizationById,
} from "@/lib/content/registry-runtime";
import { validateRegistryContent } from "./validate-registry";

const SHARED_CITATION_IDS = [
  "citation.mixtral-8x7b-release",
  "citation.mixtral-8x7b-model-card",
  "citation.mixtral-8x22b-release",
  "citation.mistral-changelog",
] as const;

describe("Mixtral MoE shared Mistral source foundation", () => {
  test("registry validation resolves the Mistral organization and primary sources", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });

  test("organization.mistral-ai is published once and lists both Mixtral model records", () => {
    const organization = getOrganizationById("organization.mistral-ai");

    expect(organization).toMatchObject({
      id: "organization.mistral-ai",
      slug: "mistral-ai",
      status: "published",
      website: "https://mistral.ai",
      modelIds: ["model.mixtral-8x7b", "model.mixtral-8x22b"],
      citationIds: [...SHARED_CITATION_IDS],
    });
  });

  test("Mistral-controlled citation records use stable ids and source URLs", () => {
    expect(getCitationById("citation.mixtral-8x7b-release")).toMatchObject({
      url: "https://mistral.ai/news/mixtral-of-experts",
      citationType: "blog",
      authors: ["Mistral AI"],
    });
    expect(getCitationById("citation.mixtral-8x7b-model-card")).toMatchObject({
      url: "https://huggingface.co/mistralai/Mixtral-8x7B-v0.1",
      citationType: "documentation",
      authors: ["Mistral AI"],
    });
    expect(getCitationById("citation.mixtral-8x22b-release")).toMatchObject({
      url: "https://mistral.ai/news/mixtral-8x22b",
      citationType: "blog",
      authors: ["Mistral AI"],
    });
    expect(getCitationById("citation.mistral-changelog")).toMatchObject({
      url: "https://docs.mistral.ai/resources/changelogs",
      citationType: "documentation",
      authors: ["Mistral AI"],
    });
  });

  test("both Mixtral model records reference the shared Mistral organization", () => {
    const mixtral8x7b = getModelById("model.mixtral-8x7b");
    const mixtral8x22b = getModelById("model.mixtral-8x22b");

    expect(mixtral8x7b?.organizationId).toBe("organization.mistral-ai");
    expect(mixtral8x22b?.organizationId).toBe("organization.mistral-ai");
  });

  test("shared changelog citation resolves once for reuse across both model pages", () => {
    const sharedCitations = resolveCitations(["citation.mistral-changelog"]);

    expect(sharedCitations).toHaveLength(1);
    expect(sharedCitations[0]?.id).toBe("citation.mistral-changelog");
    expect(sharedCitations[0]?.url).toBe(
      "https://docs.mistral.ai/resources/changelogs",
    );
  });
});
