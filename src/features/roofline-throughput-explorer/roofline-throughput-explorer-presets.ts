import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";

export const ROOFLINE_MODEL_PRESET_CONTROL_LABEL = "Model preset";
export const ROOFLINE_EMPTY_PRESETS_MESSAGE =
  "No model presets are available. Supply valid custom scenario inputs to explore roofline throughput.";

export type RooflinePresetSelection = {
  selectedPresetId: string | null;
  activeWeightSizeBillions: number | undefined;
};

function isUsablePresetSize(
  effectiveSizeBillions: number | null,
): effectiveSizeBillions is number {
  return (
    typeof effectiveSizeBillions === "number" &&
    Number.isFinite(effectiveSizeBillions) &&
    effectiveSizeBillions > 0
  );
}

export function findPresetById(
  presets: readonly RooflineModelSizePreset[],
  modelId: string,
): RooflineModelSizePreset | undefined {
  return presets.find((preset) => preset.modelId === modelId);
}

export function resolveInitialPresetSelection(
  presets: readonly RooflineModelSizePreset[],
  explicitActiveWeightSizeBillions?: number,
): RooflinePresetSelection {
  if (explicitActiveWeightSizeBillions != null) {
    const matchingPreset = presets.find(
      (preset) =>
        preset.effectiveSizeBillions === explicitActiveWeightSizeBillions,
    );

    return {
      selectedPresetId: matchingPreset?.modelId ?? null,
      activeWeightSizeBillions: explicitActiveWeightSizeBillions,
    };
  }

  const initialPreset =
    presets.find((preset) =>
      isUsablePresetSize(preset.effectiveSizeBillions),
    ) ?? presets[0];

  if (!initialPreset) {
    return {
      selectedPresetId: null,
      activeWeightSizeBillions: undefined,
    };
  }

  return {
    selectedPresetId: initialPreset.modelId,
    activeWeightSizeBillions: isUsablePresetSize(
      initialPreset.effectiveSizeBillions,
    )
      ? initialPreset.effectiveSizeBillions
      : undefined,
  };
}

export function resolvePresetSelection(
  presets: readonly RooflineModelSizePreset[],
  modelId: string,
  currentActiveWeightSizeBillions?: number,
): RooflinePresetSelection {
  const preset = findPresetById(presets, modelId);

  if (!preset) {
    return {
      selectedPresetId: null,
      activeWeightSizeBillions: currentActiveWeightSizeBillions,
    };
  }

  return {
    selectedPresetId: preset.modelId,
    activeWeightSizeBillions: isUsablePresetSize(preset.effectiveSizeBillions)
      ? preset.effectiveSizeBillions
      : undefined,
  };
}

export function formatActiveWeightSizeBillions(
  value: number | undefined,
): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1) {
    return value % 1 === 0 ? `${value}` : value.toFixed(1);
  }

  return value.toFixed(1);
}
