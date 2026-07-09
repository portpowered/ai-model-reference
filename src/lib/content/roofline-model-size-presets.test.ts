import { describe, expect, test } from "bun:test";
import { resolveEffectiveRooflineModelSize } from "@/lib/content/effective-roofline-model-size";
import { getModelById } from "@/lib/content/registry-runtime";
import {
  getRooflineModelSizePresets,
  ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS,
  ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
  resolveRooflineModelSizePreset,
} from "./roofline-model-size-presets";

function requireModel(
  registryId: (typeof ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS)[number],
) {
  const model = getModelById(registryId);
  if (!model) {
    throw new Error(`expected ${registryId} in registry`);
  }
  return model;
}

describe("getRooflineModelSizePresets", () => {
  test("returns the requested models in stable order with registry-backed labels and sizes", () => {
    const presets = getRooflineModelSizePresets();
    const registryPresets = ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS.map(
      (definition) =>
        resolveRooflineModelSizePreset(
          definition.registryId,
          requireModel(definition.registryId),
          definition.label,
          "effectiveSizeBillions" in definition
            ? definition.effectiveSizeBillions
            : undefined,
          "preferCanonicalLabel" in definition
            ? { preferCanonicalLabel: definition.preferCanonicalLabel }
            : undefined,
        ),
    );

    expect(presets).toEqual(registryPresets);
    expect(presets.map((preset) => preset.modelId)).toEqual([
      ...ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
    ]);
    expect(presets.map((preset) => preset.label)).toEqual(
      ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS.map(({ label }) => label),
    );
    expect(presets.map((preset) => preset.effectiveSizeBillions)).toEqual([
      40, 37, 13, 3, 27, 4, 0.6,
    ]);
    expect(
      presets
        .filter((preset) => preset.modelId !== "model.gemma")
        .map((preset) => preset.effectiveSizeBillions),
    ).toEqual(
      ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS.filter(
        (registryId) => registryId !== "model.gemma",
      ).map((registryId) =>
        resolveEffectiveRooflineModelSize(requireModel(registryId)),
      ),
    );
  });

  test("uses registry aliases for labels when present", () => {
    expect(
      resolveRooflineModelSizePreset(
        "model.qwen3-0-6b",
        {
          id: "model.qwen3-0-6b",
          slug: "qwen3-0-6b",
          kind: "model",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: ["Qwen3-0.6B"],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          authors: ["Example"],
          sourceId: "citation.example",
          family: "qwen",
          sourceType: "open-weights",
          modalities: ["text"],
          architectureIds: [],
          moduleIds: [],
          trainingRegimeIds: [],
          datasetIds: [],
          paperIds: [],
          organizationId: "organization.example",
          releaseDate: "2026-01-01",
          parameterCount: "0.6 billion parameters",
          contextLength: 8192,
          precision: ["bf16"],
        },
        "Fallback Label",
      ).label,
    ).toBe("Qwen3-0.6B");
  });

  test("keeps stable ordering when a registry record is missing", () => {
    const presets = ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS.map(
      (definition) =>
        resolveRooflineModelSizePreset(
          definition.registryId,
          definition.registryId === "model.glm-5-2"
            ? undefined
            : getModelById(definition.registryId),
          definition.label,
          "effectiveSizeBillions" in definition
            ? definition.effectiveSizeBillions
            : undefined,
          "preferCanonicalLabel" in definition
            ? { preferCanonicalLabel: definition.preferCanonicalLabel }
            : undefined,
        ),
    );

    expect(presets.map((preset) => preset.modelId)).toEqual([
      ...ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
    ]);
    expect(presets[0]?.label).toBe("GLM-5.2");
    expect(presets[0]?.effectiveSizeBillions).toBeNull();
    expect(
      presets.slice(1).map((preset) => preset.effectiveSizeBillions),
    ).toEqual([37, 13, 3, 27, 4, 0.6]);
  });

  test("keeps stable ordering when parameter metadata is unsupported", () => {
    const presets = ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS.map(
      ({ registryId, label }) =>
        resolveRooflineModelSizePreset(
          registryId,
          {
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
          },
          label,
        ),
    );

    expect(presets.map((preset) => preset.modelId)).toEqual([
      ...ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS,
    ]);
    expect(
      presets.every((preset) => preset.effectiveSizeBillions === null),
    ).toBe(true);
  });
});
