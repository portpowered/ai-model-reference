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
  "NVIDIA Cosmos 3",
  "Cosmos3",
  "Cosmos 3 Super",
  "Cosmos 3 Nano",
  "omnimodal world model",
  "physical AI world model",
] as const;

const PRIMARY_SOURCE_CITATION_IDS = [
  "citation.cosmos-3-technical-report",
  "citation.cosmos-3-research-page",
  "citation.cosmos-3-model-card",
  "citation.cosmos-3-github-repository",
  "citation.cosmos-3-huggingface-collection",
] as const;

describe("cosmos 3 release identity", () => {
  test("page spec records model kind with canonical slug and verified aliases", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "cosmos-3.json"),
    );

    expect(spec.kind).toBe("model");
    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.title).toBe("Cosmos 3");
    expect(spec.slug).toBe("cosmos-3");
    expect(spec.status).toBe("draft");
    for (const alias of VERIFIED_ALIASES) {
      expect(spec.aliases).toContain(alias);
    }
    expect(spec.summary).not.toMatch(
      /benchmark|throughput|ranking|outperform|state-of-the-art|best open/i,
    );
  });

  test("page spec records source-backed model-family facts without benchmark framing", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "cosmos-3.json"),
    );

    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.parameterCount).toBe("16B Nano and 64B Super family variants");
    expect(spec.releaseDate).toBe("2026-05-31");
    expect(spec.sourceType).toBe("open-weights");
    expect(spec.family).toBe("cosmos");
    expect(spec.modalities).toEqual(
      expect.arrayContaining(["text", "image", "video", "audio", "multimodal"]),
    );
    expect(spec.sourceId).toBe("citation.cosmos-3-technical-report");
    expect(spec.paperIds).toEqual(["paper.cosmos-3"]);
    expect(spec.organizationId).toBe("organization.nvidia");
  });

  test("canonical route and registry id are implied by the verified model page spec", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "cosmos-3.json"),
    );

    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(`/docs/models/${spec.slug}`).toBe("/docs/models/cosmos-3");
    expect(`model.${spec.slug}`).toBe("model.cosmos-3");
  });

  test("NVIDIA primary sources resolve through citation and paper records", () => {
    const technicalReport = getCitationById(
      "citation.cosmos-3-technical-report",
    );
    const researchPage = getCitationById("citation.cosmos-3-research-page");
    const modelCard = getCitationById("citation.cosmos-3-model-card");
    const githubRepository = getCitationById(
      "citation.cosmos-3-github-repository",
    );
    const huggingFaceCollection = getCitationById(
      "citation.cosmos-3-huggingface-collection",
    );
    const paper = getPaperById("paper.cosmos-3");
    const organization = getOrganizationById("organization.nvidia");

    expect(technicalReport?.url).toBe("https://arxiv.org/abs/2606.02800");
    expect(technicalReport?.title).toContain("Cosmos 3");
    expect(researchPage?.url).toBe(
      "https://research.nvidia.com/labs/cosmos-lab/cosmos3",
    );
    expect(modelCard?.url).toBe("https://huggingface.co/nvidia/Cosmos3-Super");
    expect(modelCard?.aliases).toContain("nvidia/Cosmos3-Super");
    expect(githubRepository?.url).toBe("https://github.com/nvidia/cosmos");
    expect(huggingFaceCollection?.url).toBe(
      "https://huggingface.co/collections/nvidia/cosmos3",
    );
    expect(paper?.citationIds).toEqual([...PRIMARY_SOURCE_CITATION_IDS]);
    expect(paper?.publishedAt).toBe("2026-05-31");
    expect(paper?.arxivId).toBe("2606.02800");
    expect(organization).toBeDefined();
  });

  test("registry validation passes for the verified Cosmos 3 source slice", async () => {
    const issues = await validateRegistryContent();
    const touchedRecordIds = [
      "citation.cosmos-3-technical-report",
      "citation.cosmos-3-research-page",
      "citation.cosmos-3-model-card",
      "citation.cosmos-3-github-repository",
      "citation.cosmos-3-huggingface-collection",
      "paper.cosmos-3",
    ];

    const touchedIssues = issues.filter((issue) =>
      touchedRecordIds.some((recordId) => issue.message.includes(recordId)),
    );
    expect(touchedIssues).toEqual([]);
  });

  test("page spec JSON stays aligned with the committed verification artifact", async () => {
    const raw = await readFile(
      join(getProjectRoot(), "page-specs", "cosmos-3.json"),
      "utf8",
    );
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "cosmos-3.json"),
    );

    expect(raw).toContain('"title": "Cosmos 3"');
    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }
    expect(spec.citationIds).toEqual([...PRIMARY_SOURCE_CITATION_IDS]);
  });
});
