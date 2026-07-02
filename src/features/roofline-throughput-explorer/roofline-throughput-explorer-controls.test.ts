import { describe, expect, test } from "bun:test";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import {
  clampActiveWeightSizeBillions,
  clampBytesPerParameter,
  parseBytesPerParameterInput,
  resolveActiveWeightSliderBounds,
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
  });

  test("clamps active weight size and bytes per parameter into valid bounds", () => {
    const bounds = resolveActiveWeightSliderBounds(TEST_PRESETS);

    expect(clampActiveWeightSizeBillions(0.01, bounds)).toBe(
      bounds.minBillions,
    );
    expect(clampActiveWeightSizeBillions(999, bounds)).toBe(bounds.maxBillions);
    expect(clampBytesPerParameter(0)).toBe(1);
    expect(clampBytesPerParameter(16)).toBe(8);
  });

  test("parses bytes-per-parameter input and rejects non-numeric values", () => {
    expect(parseBytesPerParameterInput("2")).toBe(2);
    expect(parseBytesPerParameterInput(" 4.5 ")).toBe(4.5);
    expect(parseBytesPerParameterInput("")).toBeUndefined();
    expect(parseBytesPerParameterInput("abc")).toBeUndefined();
  });

  test("initializes scenario controls from explicit inputs or first usable preset", () => {
    expect(
      resolveInitialScenarioControls({
        presets: TEST_PRESETS,
        explicitActiveWeightSizeBillions: 12,
        explicitBytesPerParameter: 4,
      }),
    ).toEqual({
      activeWeightSizeBillions: 12,
      bytesPerParameter: 4,
    });

    expect(
      resolveInitialScenarioControls({
        presets: TEST_PRESETS,
      }),
    ).toEqual({
      activeWeightSizeBillions: 40,
      bytesPerParameter: 2,
    });
  });

  test("syncs active weight from preset until the user edits the slider", () => {
    const bounds = resolveActiveWeightSliderBounds(TEST_PRESETS);
    const current = {
      activeWeightSizeBillions: 40,
      bytesPerParameter: 2,
    };

    expect(
      scenarioControlsFromPreset(TEST_PRESETS[1], bounds, current, {
        activeWeightSize: false,
        bytesPerParameter: false,
      }),
    ).toEqual({
      activeWeightSizeBillions: 0.6,
      bytesPerParameter: 2,
    });

    expect(
      scenarioControlsFromPreset(TEST_PRESETS[1], bounds, current, {
        activeWeightSize: true,
        bytesPerParameter: false,
      }),
    ).toEqual(current);
  });
});
