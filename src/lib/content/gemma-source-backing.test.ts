import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "./content-paths";
import { parsePageSpecFile } from "./page-spec";
import {
  getCitationById,
  getOrganizationById,
  getPaperById,
} from "./registry-runtime";
import { validateRegistryContent } from "./validate-registry";

const VERIFIED_ALIASES = [
  "Gemma",
  "Google Gemma",
  "Google DeepMind Gemma",
  "Gemma 4",
  "multimodal open model",
  "on-device model",
  "open model",
] as const;

const PRIMARY_SOURCE_CITATION_IDS = [
  "citation.gemma-4-technical-report",
  "citation.gemma-4-announcement",
  "citation.gemma-4-model-card",
  "citation.gemma-4-docs-overview",
  "citation.gemma-4-get-started",
] as const;

const FAMILY_ORIENTATION_CITATION_IDS = [
  "citation.gemma-deepmind-family",
  "citation.gemma-3-deepmind",
  "citation.gemma-3n-deepmind",
  "citation.gemma-4-deepmind",
  "citation.gemma-4-edge-developers-blog",
  "citation.gemma-4-apache-license",
] as const;

describe("gemma source backing", () => {
  test("page spec records the canonical family title and verified aliases", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "gemma.json"),
    );

    expect(spec.kind).toBe("model");
    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.title).toBe("Gemma");
    expect(spec.slug).toBe("gemma");
    expect(spec.status).toBe("published");
    for (const alias of VERIFIED_ALIASES) {
      expect(spec.aliases).toContain(alias);
    }
    expect(spec.summary).not.toMatch(
      /benchmark|throughput|ranking|outperform|state-of-the-art|leaderboard/i,
    );
  });

  test("page spec records source-backed family facts without benchmark framing", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "gemma.json"),
    );

    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.parameterCount).toBe(
      "E2B, E4B, 12B, 26B A4B, and 31B family variants",
    );
    expect(spec.contextLength).toBe(262144);
    expect(spec.releaseDate).toBe("2026-04-02");
    expect(spec.sourceType).toBe("open-weights");
    expect(spec.family).toBe("gemma");
    expect(spec.modalities).toEqual(["text", "image", "audio"]);
    expect(spec.sourceId).toBe("citation.gemma-4-technical-report");
    expect(spec.paperIds).toEqual(["paper.gemma-4"]);
    expect(spec.organizationId).toBe("organization.google-deepmind");
  });

  test("canonical route and registry id are implied by the verified model page spec", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "gemma.json"),
    );

    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(`/docs/models/${spec.slug}`).toBe("/docs/models/gemma");
    expect(`model.${spec.slug}`).toBe("model.gemma");
  });

  test("Google DeepMind primary sources resolve through citation and paper records", () => {
    const technicalReport = getCitationById(
      "citation.gemma-4-technical-report",
    );
    const announcement = getCitationById("citation.gemma-4-announcement");
    const modelCard = getCitationById("citation.gemma-4-model-card");
    const docsOverview = getCitationById("citation.gemma-4-docs-overview");
    const getStarted = getCitationById("citation.gemma-4-get-started");
    const paper = getPaperById("paper.gemma-4");
    const organization = getOrganizationById("organization.google-deepmind");

    expect(technicalReport?.url).toBe("https://arxiv.org/abs/2607.02770");
    expect(technicalReport?.title).toContain("Gemma 4");
    expect(announcement?.url).toBe(
      "https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/",
    );
    expect(modelCard?.url).toBe(
      "https://ai.google.dev/gemma/docs/core/model_card_4",
    );
    expect(docsOverview?.url).toBe("https://ai.google.dev/gemma/docs/core");
    expect(getStarted?.url).toBe(
      "https://ai.google.dev/gemma/docs/get_started",
    );
    expect(paper?.citationIds).toEqual([...PRIMARY_SOURCE_CITATION_IDS]);
    expect(paper?.publishedAt).toBe("2026-04-02");
    expect(paper?.arxivId).toBe("2607.02770");
    expect(organization?.paperIds).toContain("paper.gemma-4");
    expect(organization?.website).toBe("https://deepmind.google");
  });

  test("family orientation citations resolve for earlier and specialized releases", () => {
    const familyPage = getCitationById("citation.gemma-deepmind-family");
    const gemma3 = getCitationById("citation.gemma-3-deepmind");
    const gemma3n = getCitationById("citation.gemma-3n-deepmind");
    const gemma4Deepmind = getCitationById("citation.gemma-4-deepmind");
    const edgeBlog = getCitationById("citation.gemma-4-edge-developers-blog");
    const licenseBlog = getCitationById("citation.gemma-4-apache-license");

    expect(familyPage?.url).toBe("https://deepmind.google/models/gemma/");
    expect(gemma3?.url).toBe("https://deepmind.google/models/gemma/gemma-3/");
    expect(gemma3n?.url).toBe("https://deepmind.google/models/gemma/gemma-3n/");
    expect(gemma4Deepmind?.url).toBe(
      "https://deepmind.google/models/gemma/gemma-4/",
    );
    expect(edgeBlog?.url).toBe(
      "https://developers.googleblog.com/en/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/",
    );
    expect(licenseBlog?.url).toBe(
      "https://opensource.googleblog.com/2026/03/gemma-4-expanding-the-gemmaverse-with-apache-20.html",
    );
  });

  test("registry validation passes for the verified Gemma source slice", async () => {
    const issues = await validateRegistryContent();
    const touchedRecordIds = [
      ...PRIMARY_SOURCE_CITATION_IDS,
      ...FAMILY_ORIENTATION_CITATION_IDS,
      "paper.gemma-4",
      "organization.google-deepmind",
      "model.gemma",
    ];

    const touchedIssues = issues.filter((issue) =>
      touchedRecordIds.some((recordId) => issue.message.includes(recordId)),
    );
    expect(touchedIssues).toEqual([]);
  });

  test("page spec JSON stays aligned with the committed verification artifact", async () => {
    const raw = await readFile(
      join(getProjectRoot(), "page-specs", "gemma.json"),
      "utf8",
    );
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "gemma.json"),
    );

    expect(raw).toContain('"title": "Gemma"');
    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }
    expect(spec.citationIds).toEqual([...PRIMARY_SOURCE_CITATION_IDS]);
  });
});
