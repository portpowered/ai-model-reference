import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import { resolveDefaultModelPreset } from "./roofline-throughput-explorer-presets";

export const ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL =
  "Active weight size (B parameters)";
export const ROOFLINE_BATCH_SIZE_CONTROL_LABEL = "Batch size";
export const ROOFLINE_QUANTIZATION_BITS_CONTROL_LABEL = "Quantization bits";

export const ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MIN_BILLIONS = 0.1;
export const ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MAX_BILLIONS = 500;
export const ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_STEP_BILLIONS = 0.1;

export const ROOFLINE_BATCH_SIZE_MIN = 1;
export const ROOFLINE_BATCH_SIZE_MAX = 256;
export const ROOFLINE_BATCH_SIZE_STEP = 1;

export const ROOFLINE_QUANTIZATION_BITS_MIN = 1;
export const ROOFLINE_QUANTIZATION_BITS_MAX = 16;
export const ROOFLINE_QUANTIZATION_BITS_STEP = 1;

export const DEFAULT_ROOFLINE_BATCH_SIZE = 1;
export const DEFAULT_ROOFLINE_QUANTIZATION_BITS = 8;

export const ROOFLINE_BYTES_PER_PARAMETER_MIN =
  ROOFLINE_QUANTIZATION_BITS_MIN / 8;
export const ROOFLINE_BYTES_PER_PARAMETER_MAX =
  ROOFLINE_QUANTIZATION_BITS_MAX / 8;
export const ROOFLINE_BYTES_PER_PARAMETER_STEP =
  ROOFLINE_QUANTIZATION_BITS_STEP / 8;
export const ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL =
  ROOFLINE_QUANTIZATION_BITS_CONTROL_LABEL;
export const DEFAULT_ROOFLINE_BYTES_PER_PARAMETER =
  DEFAULT_ROOFLINE_QUANTIZATION_BITS / 8;

export type RooflineScenarioControls = {
  activeWeightSizeBillions: number;
  batchSize: number;
  quantizationBits: number;
};

export type RooflineScenarioControlEdits = {
  activeWeightSize: boolean;
  batchSize: boolean;
  quantizationBits: boolean;
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

export function resolveGlobalActiveWeightSliderBounds(): RooflineActiveWeightSliderBounds {
  return {
    minBillions: ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MIN_BILLIONS,
    maxBillions: ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_MAX_BILLIONS,
  };
}

export function resolveActiveWeightSliderBounds(
  presets: readonly RooflineModelSizePreset[],
  options?: { customOverride?: boolean },
): RooflineActiveWeightSliderBounds {
  if (options?.customOverride) {
    return resolveGlobalActiveWeightSliderBounds();
  }

  const presetSizes = presets
    .map((preset) => preset.effectiveSizeBillions)
    .filter(isUsablePresetSize);

  if (presetSizes.length === 0) {
    return resolveGlobalActiveWeightSliderBounds();
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

export function clampQuantizationBits(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ROOFLINE_QUANTIZATION_BITS;
  }

  return Math.min(
    ROOFLINE_QUANTIZATION_BITS_MAX,
    Math.max(ROOFLINE_QUANTIZATION_BITS_MIN, value),
  );
}

export function clampBatchSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ROOFLINE_BATCH_SIZE;
  }

  return Math.min(
    ROOFLINE_BATCH_SIZE_MAX,
    Math.max(ROOFLINE_BATCH_SIZE_MIN, Math.round(value)),
  );
}

export function clampBytesPerParameter(value: number): number {
  return clampQuantizationBits(value * 8) / 8;
}

export function parsePositiveNumberInput(rawValue: string): number | undefined {
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

export const parseBytesPerParameterInput = parsePositiveNumberInput;

export function resolveInitialScenarioControls({
  presets,
  explicitActiveWeightSizeBillions,
  explicitBytesPerParameter,
  explicitBatchSize,
  explicitQuantizationBits,
}: {
  presets: readonly RooflineModelSizePreset[];
  explicitActiveWeightSizeBillions?: number;
  explicitBatchSize?: number;
  explicitBytesPerParameter?: number;
  explicitQuantizationBits?: number;
}): RooflineScenarioControls {
  const bounds = resolveActiveWeightSliderBounds(presets);
  const initialPreset = resolveDefaultModelPreset(presets);
  const presetEffectiveSize = initialPreset?.effectiveSizeBillions ?? null;
  const presetWeight = isUsablePresetSize(presetEffectiveSize)
    ? presetEffectiveSize
    : undefined;

  const activeWeightSizeBillions = clampActiveWeightSizeBillions(
    explicitActiveWeightSizeBillions ?? presetWeight ?? 27,
    bounds,
  );
  const initialQuantizationBits =
    explicitQuantizationBits ??
    (explicitBytesPerParameter != null
      ? explicitBytesPerParameter * 8
      : DEFAULT_ROOFLINE_QUANTIZATION_BITS);

  return {
    activeWeightSizeBillions,
    batchSize: clampBatchSize(explicitBatchSize ?? DEFAULT_ROOFLINE_BATCH_SIZE),
    quantizationBits: clampQuantizationBits(initialQuantizationBits),
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
