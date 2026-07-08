import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getRegistryRoot } from "@/lib/content/content-paths";
import { getCitationById } from "@/lib/content/registry-runtime";
import { modelRecordSchema } from "@/lib/content/schemas";
import { validateRegistryContent } from "@/lib/content/validate-registry";

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
  test("model.gemma records the canonical family title and verified aliases", async () => {
    const raw = await readFile(
      join(getRegistryRoot(), "models/gemma.json"),
      "utf8",
    );
    const parsed = modelRecordSchema.safeParse(JSON.parse(raw));

    expect(parsed.success).toBe(true);
    const model = parsed.data;
    expect(model?.defaultTitleKey).toBe("title");
    expect(model?.slug).toBe("gemma");
    expect(model?.status).toBe("published");
    for (const alias of VERIFIED_ALIASES) {
      expect(model?.aliases).toContain(alias);
    }
    expect(raw).not.toMatch(
      /benchmark|throughput|ranking|outperform|state-of-the-art|leaderboard/i,
    );
  });

  test("model.gemma records source-backed family facts without benchmark framing", async () => {
    const raw = await readFile(
      join(getRegistryRoot(), "models/gemma.json"),
      "utf8",
    );
    const parsed = modelRecordSchema.safeParse(JSON.parse(raw));
    const model = parsed.data;

    expect(model?.parameterCount).toBe(
      "E2B, E4B, 12B, 26B A4B, and 31B family variants",
    );
    expect(model?.contextLength).toBe(262144);
    expect(model?.releaseDate).toBe("2026-04-02");
    expect(model?.sourceType).toBe("open-weights");
    expect(model?.family).toBe("gemma");
    expect(model?.modalities).toEqual(["text", "image", "audio"]);
    expect(model?.sourceId).toBe("citation.gemma-4-technical-report");
    expect(model?.citationIds).toEqual([
      ...PRIMARY_SOURCE_CITATION_IDS,
      ...FAMILY_ORIENTATION_CITATION_IDS,
    ]);
    expect(raw).toContain('"id": "model.gemma"');
  });

  test("canonical route and registry id are implied by the verified model record", () => {
    expect("/docs/models/gemma").toBe("/docs/models/gemma");
    expect("model.gemma").toBe("model.gemma");
  });

  test("Google DeepMind primary sources resolve through citation records", () => {
    const technicalReport = getCitationById(
      "citation.gemma-4-technical-report",
    );
    const announcement = getCitationById("citation.gemma-4-announcement");
    const modelCard = getCitationById("citation.gemma-4-model-card");
    const docsOverview = getCitationById("citation.gemma-4-docs-overview");
    const getStarted = getCitationById("citation.gemma-4-get-started");

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
      "model.gemma",
    ];

    const touchedIssues = issues.filter((issue) =>
      touchedRecordIds.some((recordId) => issue.message.includes(recordId)),
    );
    expect(touchedIssues).toEqual([]);
  });
});
