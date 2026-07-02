import { describe, expect, test } from "bun:test";
import { getModelById } from "@/lib/content/registry-runtime";
import {
  getRooflineModelSizePresets,
  ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
  resolveRooflineModelSizePreset,
} from "./roofline-model-size-presets";

describe("getRooflineModelSizePresets", () => {
  test("returns the requested models in stable order with registry-backed labels and sizes", () => {
    const presets = getRooflineModelSizePresets();

    expect(presets.map((preset) => preset.modelId)).toEqual([
      ...ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
    ]);
    expect(presets.map((preset) => preset.label)).toEqual([
      "GLM-5.2",
      "DeepSeek-V4-Pro",
      "Qwen3.6-35B-A3B",
      "Qwen3.6-27B",
      "Qwen3-0.6B",
    ]);
    expect(presets.map((preset) => preset.effectiveSizeBillions)).toEqual([
      40, 37, 3, 27, 0.6,
    ]);
  });

  test("keeps stable ordering when a registry record is missing", () => {
    const presets = ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS.map((registryId) =>
      resolveRooflineModelSizePreset(
        registryId,
        registryId === "model.glm-5-2" ? undefined : getModelById(registryId),
      ),
    );

    expect(presets.map((preset) => preset.modelId)).toEqual([
      ...ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
    ]);
    expect(presets[0]?.effectiveSizeBillions).toBeNull();
    expect(
      presets.slice(1).map((preset) => preset.effectiveSizeBillions),
    ).toEqual([37, 3, 27, 0.6]);
  });

  test("keeps stable ordering when parameter metadata is unsupported", () => {
    const presets = ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS.map((registryId) =>
      resolveRooflineModelSizePreset(registryId, {
        id: registryId,
        slug: registryId.replace(/^model\./, ""),
        kind: "model",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: ["Example Model"],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        authors: ["Example"],
        sourceId: "citation.example",
        family: "example",
        sourceType: "open-weights",
        modalities: ["text"],
        architectureIds: [],
        moduleIds: [],
        trainingRegimeIds: [],
        datasetIds: [],
        paperIds: [],
        organizationId: "organization.example",
        releaseDate: "2026-01-01",
        parameterCount: "about 40B parameters",
        activeParameterCount: "not supported",
        contextLength: 8192,
        precision: ["bf16"],
      }),
    );

    expect(presets.map((preset) => preset.modelId)).toEqual([
      ...ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
    ]);
    expect(
      presets.every((preset) => preset.effectiveSizeBillions === null),
    ).toBe(true);
  });
});
