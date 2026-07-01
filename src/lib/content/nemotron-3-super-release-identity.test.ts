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
  "Nemotron-3-Super-120B-A12B-BF16",
  "Nemotron-3-Super-120B-A12B-NVFP4",
  "nvidia/nemotron-3-super-120b-a12b",
] as const;

const PRIMARY_SOURCE_CITATION_IDS = [
  "citation.nemotron-3-super-technical-report",
  "citation.nemotron-3-super-research-page",
  "citation.nemotron-3-super-model-card",
  "citation.nemotron-3-super-nim-build-page",
] as const;

describe("nemotron 3 super release identity", () => {
  test("page spec records the canonical title and verified aliases", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "nemotron-3-super.json"),
    );

    expect(spec.kind).toBe("model");
    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.title).toBe("Nemotron 3 Super");
    expect(spec.slug).toBe("nemotron-3-super");
    expect(spec.status).toBe("draft");
    for (const alias of VERIFIED_ALIASES) {
      expect(spec.aliases).toContain(alias);
    }
    expect(spec.summary).not.toMatch(
      /benchmark|throughput|ranking|outperform/i,
    );
  });

  test("page spec records source-backed release facts without benchmark framing", async () => {
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "nemotron-3-super.json"),
    );

    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }

    expect(spec.parameterCount).toBe("120 billion total parameters");
    expect(spec.activeParameterCount).toBe("12 billion active parameters");
    expect(spec.contextLength).toBe(1_048_576);
    expect(spec.precision).toEqual(["bf16", "nvfp4"]);
    expect(spec.releaseDate).toBe("2026-03-11");
    expect(spec.sourceType).toBe("open-weights");
    expect(spec.family).toBe("nemotron");
    expect(spec.modalities).toEqual(["text"]);
    expect(spec.sourceId).toBe("citation.nemotron-3-super-technical-report");
    expect(spec.paperIds).toEqual(["paper.nemotron-3-super"]);
    expect(spec.organizationId).toBe("organization.nvidia");
  });

  test("NVIDIA primary sources resolve through citation and paper records", () => {
    const technicalReport = getCitationById(
      "citation.nemotron-3-super-technical-report",
    );
    const researchPage = getCitationById(
      "citation.nemotron-3-super-research-page",
    );
    const modelCard = getCitationById("citation.nemotron-3-super-model-card");
    const nimBuildPage = getCitationById(
      "citation.nemotron-3-super-nim-build-page",
    );
    const paper = getPaperById("paper.nemotron-3-super");
    const organization = getOrganizationById("organization.nvidia");

    expect(technicalReport?.url).toBe(
      "https://research.nvidia.com/labs/nemotron/files/NVIDIA-Nemotron-3-Super-Technical-Report.pdf",
    );
    expect(technicalReport?.title).toContain("Nemotron 3 Super");
    expect(researchPage?.url).toBe(
      "https://research.nvidia.com/labs/nemotron/Nemotron-3-Super/",
    );
    expect(modelCard?.url).toBe(
      "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16",
    );
    expect(modelCard?.aliases).toContain(
      "NVIDIA-Nemotron-3-Super-120B-A12B-BF16",
    );
    expect(nimBuildPage?.aliases).toContain(
      "nvidia/nemotron-3-super-120b-a12b",
    );
    expect(nimBuildPage?.url).toBe(
      "https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b",
    );
    expect(paper?.citationIds).toEqual([...PRIMARY_SOURCE_CITATION_IDS]);
    expect(paper?.publishedAt).toBe("2026-03-11");
    expect(paper?.arxivId).toBe("2604.12374");
    expect(organization?.paperIds).toContain("paper.nemotron-3-super");
  });

  test("registry validation passes for the verified Nemotron 3 Super source slice", async () => {
    const issues = await validateRegistryContent();
    const touchedRecordIds = [
      "citation.nemotron-3-super-technical-report",
      "citation.nemotron-3-super-research-page",
      "citation.nemotron-3-super-model-card",
      "citation.nemotron-3-super-nim-build-page",
      "paper.nemotron-3-super",
      "organization.nvidia",
    ];

    const touchedIssues = issues.filter((issue) =>
      touchedRecordIds.some((recordId) => issue.message.includes(recordId)),
    );
    expect(touchedIssues).toEqual([]);
  });

  test("page spec JSON stays aligned with the committed verification artifact", async () => {
    const raw = await readFile(
      join(getProjectRoot(), "page-specs", "nemotron-3-super.json"),
      "utf8",
    );
    const spec = await parsePageSpecFile(
      join(getProjectRoot(), "page-specs", "nemotron-3-super.json"),
    );

    expect(raw).toContain('"title": "Nemotron 3 Super"');
    if (spec.kind !== "model") {
      throw new Error("expected model page spec");
    }
    expect(spec.citationIds).toEqual([...PRIMARY_SOURCE_CITATION_IDS]);
  });
});
