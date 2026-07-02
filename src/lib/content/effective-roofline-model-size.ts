import { parseBillionParameterCount } from "./parse-billion-parameter-count";

export type ModelParameterMetadata = {
  parameterCount?: string;
  activeParameterCount?: string;
};

/**
 * Resolves the per-token roofline model size in billions from registry
 * parameter metadata.
 *
 * Sparse or MoE records with a supported `activeParameterCount` use that
 * active size. Dense records without a supported active count fall back to
 * `parameterCount`. Returns `null` when neither field parses.
 */
export function resolveEffectiveRooflineModelSize(
  record: ModelParameterMetadata,
): number | null {
  const activeSize = parseBillionParameterCount(record.activeParameterCount);
  if (activeSize != null) {
    return activeSize;
  }

  return parseBillionParameterCount(record.parameterCount);
}
