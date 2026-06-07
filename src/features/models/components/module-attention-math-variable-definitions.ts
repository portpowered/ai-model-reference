/** Symbol definition ids rendered under the MHA attention-schema equation. */
export const MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS = [
  "q",
  "k",
  "v",
  "h",
  "dk",
  "i",
] as const;

/** Symbol definition ids rendered under the GQA attention-schema equation. */
export const MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS = [
  "q",
  "k",
  "v",
  "h",
  "g",
  "dk",
  "i",
  "gi",
] as const;

/** GQA-only symbol ids beyond the shared MHA set. */
export const MODULE_ATTENTION_GQA_ONLY_MATH_VARIABLE_DEFINITION_IDS = [
  "g",
  "gi",
] as const;

/** Union of symbol ids used by module math convergence checks. */
export const MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS = [
  ...MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
  ...MODULE_ATTENTION_GQA_ONLY_MATH_VARIABLE_DEFINITION_IDS,
] as const;

/** Concept labels that must not appear as math-block definition rows. */
export const MODULE_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS = [
  "Query projection",
  "Key projection",
  "Value projection",
  "Query heads",
  "Key-value heads",
  "Query-to-KV grouping",
] as const;

export type ModuleAttentionMathSchemaId = "mha" | "gqa";

export function moduleAttentionMathVariableDefinitionIdsForSchema(
  schemaId: ModuleAttentionMathSchemaId,
): readonly string[] {
  return schemaId === "mha"
    ? MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS
    : MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS;
}
