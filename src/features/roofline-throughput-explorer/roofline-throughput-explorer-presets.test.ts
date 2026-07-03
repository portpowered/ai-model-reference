import { describe, expect, test } from "bun:test";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import {
  resolveInitialPresetSelection,
  resolvePresetSelection,
} from "./roofline-throughput-explorer-presets";

const TEST_PRESETS = [
  {
    modelId: "model.glm-5-2",
    label: "GLM-5.2",
    effectiveSizeBillions: 40,
  },
  {
    modelId: "model.qwen-3-6-27b",
    label: "Qwen3.6-27B",
    effectiveSizeBillions: 27,
  },
  {
    modelId: "model.qwen3-0-6b",
    label: "Test Missing Size",
    effectiveSizeBillions: null,
  },
] satisfies RooflineModelSizePreset[];

describe("roofline-throughput-explorer-presets", () => {
  test("initializes from the first preset with a usable effective size", () => {
    expect(resolveInitialPresetSelection(TEST_PRESETS)).toEqual({
      selectedPresetId: "model.glm-5-2",
      activeWeightSizeBillions: 40,
    });
  });

  test("prefers an explicit active weight size and matching preset id when provided", () => {
    expect(resolveInitialPresetSelection(TEST_PRESETS, 27)).toEqual({
      selectedPresetId: "model.qwen-3-6-27b",
      activeWeightSizeBillions: 27,
    });
  });

  test("updates active weight size when a preset is selected", () => {
    expect(resolvePresetSelection(TEST_PRESETS, "model.qwen-3-6-27b")).toEqual({
      selectedPresetId: "model.qwen-3-6-27b",
      activeWeightSizeBillions: 27,
    });
  });

  test("clears active weight size when the selected preset has no effective size", () => {
    expect(resolvePresetSelection(TEST_PRESETS, "model.qwen3-0-6b")).toEqual({
      selectedPresetId: "model.qwen3-0-6b",
      activeWeightSizeBillions: undefined,
    });
  });
});
