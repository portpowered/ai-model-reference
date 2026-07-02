import { getModelById } from "@/lib/content/registry-runtime";
import { resolveEffectiveRooflineModelSize } from "./effective-roofline-model-size";
import { registryDisplayTitle } from "./registry-linking";
import type { ModelRecord } from "./schemas";

export const ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS = [
  { registryId: "model.glm-5-2", label: "GLM-5.2" },
  { registryId: "model.deepseek-v4-pro", label: "DeepSeek-V4-Pro" },
  { registryId: "model.qwen-3-6-35b-a3b", label: "Qwen3.6-35B-A3B" },
  { registryId: "model.qwen-3-6-27b", label: "Qwen3.6-27B" },
  { registryId: "model.qwen3-0-6b", label: "Qwen3-0.6B" },
] as const;

export const ROOFLINE_MODEL_SIZE_PRESET_REGISTRY_IDS =
  ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS.map(
    (definition) => definition.registryId,
  );

export type RooflineModelSizePresetRegistryId =
  (typeof ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS)[number]["registryId"];

export type RooflineModelSizePreset = {
  modelId: RooflineModelSizePresetRegistryId;
  label: string;
  effectiveSizeBillions: number | null;
};

function resolvePresetDisplayLabel(
  record: ModelRecord | undefined,
  canonicalLabel: string,
): string {
  if (record?.aliases?.[0]) {
    return registryDisplayTitle(record);
  }

  return canonicalLabel;
}

export function resolveRooflineModelSizePreset(
  registryId: RooflineModelSizePresetRegistryId,
  record: ModelRecord | undefined,
  canonicalLabel: string,
): RooflineModelSizePreset {
  return {
    modelId: registryId,
    label: resolvePresetDisplayLabel(record, canonicalLabel),
    effectiveSizeBillions: record
      ? resolveEffectiveRooflineModelSize(record)
      : null,
  };
}

/**
 * Returns registry-backed roofline model-size presets in stable order for the
 * supported comparison set. Numeric sizes come from parsed registry parameter
 * metadata; missing records or unsupported metadata keep their slot with a null
 * effective size.
 */
export function getRooflineModelSizePresets(): RooflineModelSizePreset[] {
  return ROOFLINE_MODEL_SIZE_PRESET_DEFINITIONS.map(({ registryId, label }) =>
    resolveRooflineModelSizePreset(registryId, getModelById(registryId), label),
  );
}
