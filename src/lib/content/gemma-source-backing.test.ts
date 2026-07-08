import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "./content-paths";
import { parsePageSpecFile } from "./page-spec";
import { getCitationById, getOrganizationById } from "./registry-runtime";
import { validateRegistryContent } from "./validate-registry";

const VERIFIED_ALIASES = [
  "Gemma",
  "Google Gemma",
  "Google DeepMind Gemma",
  "Gemma 4",
  "Gemma open models",
  "multimodal open model",
  "on-device model",
] as const;

const PRIMARY_SOURCE_CITATION_IDS = [
  "citation.gemma-4-deepmind",
  "citation.gemma-4-announcement",
  "citation.gemma-deepmind-family",
  "citation.gemma-4-edge-developers-blog",
  "citation.gemma-4-apache-license",
  "citation.gemma-3-deepmind",
  "citation.gemma-3n-deepmind",
] as const;

describe("gemma source backing", () => {
  test("page spec records model kind with canonical slug and verified aliases", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "gemma.json"),
    );

    expect(spec.kind).toBe("model");
    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.title).toBe("Gemma");
    expect(spec.slug).toBe("gemma");
    expect(spec.status).toBe("draft");
    for (const alias of VERIFIED_ALIASES) {
      expect(spec.aliases).toContain(alias);
    }
    expect(spec.summary).not.toMatch(
      /benchmark|throughput|ranking|outperform|state-of-the-art|best open|leaderboard/i,
    );
  });

  test("page spec records source-backed model-family facts without benchmark framing", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "gemma.json"),
    );

    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.parameterCount).toBe(
      "E2B, E4B, 12B, 26B MoE, and 31B dense family variants",
    );
    expect(spec.releaseDate).toBe("2026-04-02");
    expect(spec.sourceType).toBe("open-weights");
    expect(spec.family).toBe("gemma");
    expect(spec.modalities).toEqual(
      expect.arrayContaining(["text", "image", "video", "audio", "multimodal"]),
    );
    expect(spec.sourceId).toBe("citation.gemma-4-deepmind");
    expect(spec.paperIds).toEqual([]);
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

  test("Google and DeepMind primary sources resolve through citation records", () => {
    const gemma4Deepmind = getCitationById("citation.gemma-4-deepmind");
    const gemma4Announcement = getCitationById("citation.gemma-4-announcement");
    const gemmaFamily = getCitationById("citation.gemma-deepmind-family");
    const gemma4EdgeBlog = getCitationById(
      "citation.gemma-4-edge-developers-blog",
    );
    const gemma4License = getCitationById("citation.gemma-4-apache-license");
    const gemma3Deepmind = getCitationById("citation.gemma-3-deepmind");
    const gemma3nDeepmind = getCitationById("citation.gemma-3n-deepmind");
    const organization = getOrganizationById("organization.google-deepmind");

    expect(gemma4Deepmind?.url).toBe(
      "https://deepmind.google/models/gemma/gemma-4/",
    );
    expect(gemma4Deepmind?.title).toContain("Gemma 4");
    expect(gemma4Announcement?.url).toBe(
      "https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/",
    );
    expect(gemmaFamily?.url).toBe("https://deepmind.google/models/gemma/");
    expect(gemma4EdgeBlog?.url).toBe(
      "https://developers.googleblog.com/en/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/",
    );
    expect(gemma4License?.url).toBe(
      "https://opensource.googleblog.com/2026/03/gemma-4-expanding-the-gemmaverse-with-apache-20.html",
    );
    expect(gemma3Deepmind?.url).toBe(
      "https://deepmind.google/models/gemma/gemma-3/",
    );
    expect(gemma3nDeepmind?.url).toBe(
      "https://deepmind.google/models/gemma/gemma-3n/",
    );
    expect(organization?.website).toBe("https://deepmind.google");
    expect(organization?.citationIds).toEqual(
      expect.arrayContaining([
        "citation.gemma-deepmind-family",
        "citation.gemma-4-deepmind",
        "citation.gemma-4-announcement",
      ]),
    );
  });

  test("registry validation passes for the verified Gemma source slice", async () => {
    const issues = await validateRegistryContent();
    const touchedRecordIds = [
      ...PRIMARY_SOURCE_CITATION_IDS,
      "organization.google-deepmind",
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
