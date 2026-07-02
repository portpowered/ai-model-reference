import {
  ROOFLINE_BYTES_PER_PARAMETER_MAX,
  ROOFLINE_BYTES_PER_PARAMETER_MIN,
} from "./roofline-throughput-explorer-controls";

export const ROOFLINE_CUSTOM_OVERRIDE_PRESET_ID =
  "__roofline_custom_override__";
export const ROOFLINE_CUSTOM_OVERRIDE_PRESET_LABEL = "Custom override";

export const ROOFLINE_CUSTOM_ACTIVE_WEIGHT_ERROR =
  "Enter a positive active weight size in billions.";
export const ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR = `Enter bytes per parameter between ${ROOFLINE_BYTES_PER_PARAMETER_MIN} and ${ROOFLINE_BYTES_PER_PARAMETER_MAX}.`;

export type RooflineCustomOverrideField =
  | "activeWeightSizeBillions"
  | "bytesPerParameter";

export type RooflineCustomOverrideFieldErrors = Partial<
  Record<RooflineCustomOverrideField, string>
>;

export function isCustomOverridePresetId(
  presetId: string | null | undefined,
): boolean {
  return presetId === ROOFLINE_CUSTOM_OVERRIDE_PRESET_ID;
}

export function validateCustomActiveWeightSizeBillions(
  rawValue: string,
): { kind: "valid"; value: number } | { kind: "invalid"; message: string } {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return { kind: "invalid", message: ROOFLINE_CUSTOM_ACTIVE_WEIGHT_ERROR };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { kind: "invalid", message: ROOFLINE_CUSTOM_ACTIVE_WEIGHT_ERROR };
  }

  return { kind: "valid", value: parsed };
}

export function validateCustomBytesPerParameter(
  rawValue: string,
): { kind: "valid"; value: number } | { kind: "invalid"; message: string } {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return {
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR,
    };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return {
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR,
    };
  }

  if (
    parsed < ROOFLINE_BYTES_PER_PARAMETER_MIN ||
    parsed > ROOFLINE_BYTES_PER_PARAMETER_MAX
  ) {
    return {
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR,
    };
  }

  return { kind: "valid", value: parsed };
}

export function rectsOverlap(
  left: DOMRect,
  right: DOMRect,
  tolerancePx = 1,
): boolean {
  const overlapWidth =
    Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const overlapHeight =
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);

  return overlapWidth > tolerancePx && overlapHeight > tolerancePx;
}

export function controlRegionsOverlap(
  regions: readonly DOMRect[],
  tolerancePx = 1,
): boolean {
  for (let index = 0; index < regions.length; index += 1) {
    for (
      let otherIndex = index + 1;
      otherIndex < regions.length;
      otherIndex += 1
    ) {
      if (rectsOverlap(regions[index], regions[otherIndex], tolerancePx)) {
        return true;
      }
    }
  }

  return false;
}
