import { describe, expect, test } from "bun:test";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import {
  clampActiveWeightSizeBillions,
  clampBatchSize,
  clampQuantizationBits,
  parsePositiveNumberInput,
  resolveActiveWeightSliderBounds,
  resolveGlobalActiveWeightSliderBounds,
  resolveInitialScenarioControls,
  scenarioControlsFromPreset,
} from "./roofline-throughput-explorer-controls";

const TEST_PRESETS = [
  {
    modelId: "model.glm-5-2",
    label: "GLM-5.2",
    effectiveSizeBillions: 40,
  },
  {
    modelId: "model.qwen-3-6-35b-a3b",
    label: "Qwen3.6-35B-A3B",
    effectiveSizeBillions: 3,
  },
  {
    modelId: "model.qwen3-0-6b",
    label: "Qwen3-0.6B",
    effectiveSizeBillions: 0.6,
  },
] satisfies RooflineModelSizePreset[];

describe("roofline-throughput-explorer-controls", () => {
  test("derives slider bounds from preset sizes with global floor and ceiling", () => {
    expect(resolveActiveWeightSliderBounds(TEST_PRESETS)).toEqual({
      minBillions: 0.1,
      maxBillions: 80,
    });
    expect(
      resolveActiveWeightSliderBounds(TEST_PRESETS, { customOverride: true }),
    ).toEqual(resolveGlobalActiveWeightSliderBounds());
  });

  test("clamps active weight size, quantization bits, and batch size into valid bounds", () => {
    const bounds = resolveActiveWeightSliderBounds(TEST_PRESETS);

    expect(clampActiveWeightSizeBillions(0.01, bounds)).toBe(
      bounds.minBillions,
    );
    expect(clampActiveWeightSizeBillions(999, bounds)).toBe(bounds.maxBillions);
    expect(clampQuantizationBits(0)).toBe(1);
    expect(clampQuantizationBits(32)).toBe(16);
    expect(clampBatchSize(0)).toBe(1);
    expect(clampBatchSize(999)).toBe(256);
  });

  test("parses positive numeric input and rejects non-numeric values", () => {
    expect(parsePositiveNumberInput("2")).toBe(2);
    expect(parsePositiveNumberInput(" 4.5 ")).toBe(4.5);
    expect(parsePositiveNumberInput("")).toBeUndefined();
    expect(parsePositiveNumberInput("abc")).toBeUndefined();
  });

  test("initializes scenario controls from explicit inputs or first usable preset", () => {
    expect(
      resolveInitialScenarioControls({
        presets: TEST_PRESETS,
        explicitActiveWeightSizeBillions: 12,
        explicitBatchSize: 8,
        explicitQuantizationBits: 4,
      }),
    ).toEqual({
      activeWeightSizeBillions: 12,
      batchSize: 8,
      quantizationBits: 4,
    });

    expect(
      resolveInitialScenarioControls({
        presets: TEST_PRESETS,
      }),
    ).toEqual({
      activeWeightSizeBillions: 3,
      batchSize: 1,
      quantizationBits: 8,
    });
  });

  test("syncs active weight from preset until the user edits the slider", () => {
    const bounds = resolveActiveWeightSliderBounds(TEST_PRESETS);
    const current = {
      activeWeightSizeBillions: 40,
      batchSize: 1,
      quantizationBits: 8,
    };

    expect(
      scenarioControlsFromPreset(TEST_PRESETS[2], bounds, current, {
        activeWeightSize: false,
        batchSize: false,
        quantizationBits: false,
      }),
    ).toEqual({
      activeWeightSizeBillions: 0.6,
      batchSize: 1,
      quantizationBits: 8,
    });

    expect(
      scenarioControlsFromPreset(TEST_PRESETS[2], bounds, current, {
        activeWeightSize: true,
        batchSize: false,
        quantizationBits: false,
      }),
    ).toEqual(current);
  });
});
