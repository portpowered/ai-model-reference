import { resolveEffectiveRooflineModelSize } from "./effective-roofline-model-size";
import { registryDisplayTitle } from "./registry-linking";
import { getModelById } from "./registry-runtime";
import type { ModelRecord } from "./schemas";

export const ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS = [
  "model.glm-5-2",
  "model.deepseek-v4-pro",
  "model.qwen-3-6-35b-a3b",
  "model.qwen-3-6-27b",
  "model.qwen3-0-6b",
] as const;

export type RooflineModelSizePresetRegistryId =
  (typeof ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS)[number];

export type RooflineModelSizePreset = {
  modelId: RooflineModelSizePresetRegistryId;
  label: string;
  effectiveSizeBillions: number | null;
};

function presetLabelForMissingRecord(
  registryId: RooflineModelSizePresetRegistryId,
): string {
  const slug = registryId.replace(/^model\./, "");
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveRooflineModelSizePreset(
  registryId: RooflineModelSizePresetRegistryId,
  record: ModelRecord | undefined,
): RooflineModelSizePreset {
  if (!record) {
    return {
      modelId: registryId,
      label: presetLabelForMissingRecord(registryId),
      effectiveSizeBillions: null,
    };
  }

  return {
    modelId: registryId,
    label: registryDisplayTitle(record),
    effectiveSizeBillions: resolveEffectiveRooflineModelSize(record),
  };
}

/**
 * Returns registry-backed roofline model-size presets in stable order for the
 * supported comparison set. Numeric sizes come from parsed registry parameter
 * metadata; missing records or unsupported metadata keep their slot with a null
 * effective size.
 */
export function getRooflineModelSizePresets(): RooflineModelSizePreset[] {
  return ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS.map((registryId) =>
    resolveRooflineModelSizePreset(registryId, getModelById(registryId)),
  );
}
