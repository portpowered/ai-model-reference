import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";

export const ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL =
  "Active weight size (B parameters)";
export const ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL = "Bytes per parameter";

export const ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MIN_BILLIONS = 0.1;
export const ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MAX_BILLIONS = 500;
export const ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_STEP_BILLIONS = 0.1;

export const ROOFLINE_BYTES_PER_PARAMETER_MIN = 1;
export const ROOFLINE_BYTES_PER_PARAMETER_MAX = 8;
export const ROOFLINE_BYTES_PER_PARAMETER_STEP = 0.5;

export const DEFAULT_ROOFLINE_BYTES_PER_PARAMETER = 2;

export type RooflineScenarioControls = {
  activeWeightSizeBillions: number;
  bytesPerParameter: number;
};

export type RooflineScenarioControlEdits = {
  activeWeightSize: boolean;
  bytesPerParameter: boolean;
};

export type RooflineActiveWeightSliderBounds = {
  minBillions: number;
  maxBillions: number;
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

export function resolveActiveWeightSliderBounds(
  presets: readonly RooflineModelSizePreset[],
): RooflineActiveWeightSliderBounds {
  const presetSizes = presets
    .map((preset) => preset.effectiveSizeBillions)
    .filter(isUsablePresetSize);

  if (presetSizes.length === 0) {
    return {
      minBillions: ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MIN_BILLIONS,
      maxBillions: ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MAX_BILLIONS,
    };
  }

  const smallestPreset = Math.min(...presetSizes);
  const largestPreset = Math.max(...presetSizes);

  return {
    minBillions: Math.max(
      ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MIN_BILLIONS,
      Math.floor(smallestPreset * 0.25 * 10) / 10,
    ),
    maxBillions: Math.min(
      ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MAX_BILLIONS,
      Math.ceil(largestPreset * 2 * 10) / 10,
    ),
  };
}

export function clampActiveWeightSizeBillions(
  value: number,
  bounds: RooflineActiveWeightSliderBounds,
): number {
  if (!Number.isFinite(value)) {
    return bounds.minBillions;
  }

  return Math.min(bounds.maxBillions, Math.max(bounds.minBillions, value));
}

export function clampBytesPerParameter(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ROOFLINE_BYTES_PER_PARAMETER;
  }

  return Math.min(
    ROOFLINE_BYTES_PER_PARAMETER_MAX,
    Math.max(ROOFLINE_BYTES_PER_PARAMETER_MIN, value),
  );
}

export function parseBytesPerParameterInput(
  rawValue: string,
): number | undefined {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export function resolveInitialScenarioControls({
  presets,
  explicitActiveWeightSizeBillions,
  explicitBytesPerParameter,
}: {
  presets: readonly RooflineModelSizePreset[];
  explicitActiveWeightSizeBillions?: number;
  explicitBytesPerParameter?: number;
}): RooflineScenarioControls {
  const bounds = resolveActiveWeightSliderBounds(presets);
  const initialPreset =
    presets.find((preset) =>
      isUsablePresetSize(preset.effectiveSizeBillions),
    ) ?? presets[0];
  const presetWeight = isUsablePresetSize(initialPreset?.effectiveSizeBillions)
    ? initialPreset.effectiveSizeBillions
    : undefined;

  const activeWeightSizeBillions = clampActiveWeightSizeBillions(
    explicitActiveWeightSizeBillions ?? presetWeight ?? 27,
    bounds,
  );

  return {
    activeWeightSizeBillions,
    bytesPerParameter: clampBytesPerParameter(
      explicitBytesPerParameter ?? DEFAULT_ROOFLINE_BYTES_PER_PARAMETER,
    ),
  };
}

export function scenarioControlsFromPreset(
  preset: RooflineModelSizePreset | undefined,
  bounds: RooflineActiveWeightSliderBounds,
  current: RooflineScenarioControls,
  edits: RooflineScenarioControlEdits,
): RooflineScenarioControls {
  const next: RooflineScenarioControls = { ...current };

  if (
    !edits.activeWeightSize &&
    preset &&
    isUsablePresetSize(preset.effectiveSizeBillions)
  ) {
    next.activeWeightSizeBillions = clampActiveWeightSizeBillions(
      preset.effectiveSizeBillions,
      bounds,
    );
  }

  return next;
}
