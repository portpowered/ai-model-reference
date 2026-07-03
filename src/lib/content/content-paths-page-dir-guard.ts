/**
 * Guard against new ordinary docs page directory exports in content-paths.ts.
 *
 * Routine canonical pages should use getDocsPageDir instead of adding
 * page-specific `_PAGE_DIR` constants. Existing exports are grandfathered via
 * {@link ALLOWED_ORDINARY_PAGE_DIR_EXPORTS}.
 */

/** Grandfathered page-specific directory exports that predate derived lookup. */
export const ALLOWED_ORDINARY_PAGE_DIR_EXPORTS = [
  "ALIBI_CONCEPT_PAGE_DIR",
  "ALIBI_GLOSSARY_PAGE_DIR",
  "ATTENTION_MODULE_PAGE_DIR",
  "BATCH_NORM_GLOSSARY_PAGE_DIR",
  "BLOCK_SPARSE_ATTENTION_PAGE_DIR",
  "BPE_MODULE_PAGE_DIR",
  "BYTE_LEVEL_TOKENIZATION_PAGE_DIR",
  "CONTEXT_EXTENSION_CONCEPT_PAGE_DIR",
  "CONTEXT_WINDOW_GLOSSARY_PAGE_DIR",
  "DECODE_GLOSSARY_PAGE_DIR",
  "FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR",
  "GELU_GLOSSARY_PAGE_DIR",
  "GREEDY_DECODING_GLOSSARY_PAGE_DIR",
  "GROUP_NORM_GLOSSARY_PAGE_DIR",
  "GROUPED_QUERY_ATTENTION_PAGE_DIR",
  "HIDDEN_SIZE_GLOSSARY_PAGE_DIR",
  "KV_CACHE_GLOSSARY_PAGE_DIR",
  "LAYER_NORM_GLOSSARY_PAGE_DIR",
  "LEAKY_RELU_GLOSSARY_PAGE_DIR",
  "LINEAR_ATTENTION_PAGE_DIR",
  "LOCAL_ATTENTION_PAGE_DIR",
  "MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR",
  "MULTI_HEAD_ATTENTION_PAGE_DIR",
  "MULTI_HEAD_LATENT_ATTENTION_PAGE_DIR",
  "MULTI_QUERY_ATTENTION_PAGE_DIR",
  "NORMALIZATION_GLOSSARY_PAGE_DIR",
  "POSITIONAL_ENCODINGS_CONCEPT_PAGE_DIR",
  "PREFILL_CONCEPT_PAGE_DIR",
  "PREFILL_GLOSSARY_PAGE_DIR",
  "QK_NORM_GLOSSARY_PAGE_DIR",
  "RELU_GLOSSARY_PAGE_DIR",
  "RESIDUAL_CONNECTION_GLOSSARY_PAGE_DIR",
  "RMSNORM_GLOSSARY_PAGE_DIR",
  "ROPE_GLOSSARY_PAGE_DIR",
  "SAMPLING_OVERVIEW_GLOSSARY_PAGE_DIR",
  "SENTENCEPIECE_MODULE_PAGE_DIR",
  "SIGMOID_GLOSSARY_PAGE_DIR",
  "SILU_GLOSSARY_PAGE_DIR",
  "SKIP_CONNECTION_GLOSSARY_PAGE_DIR",
  "SLIDING_WINDOW_ATTENTION_PAGE_DIR",
  "SPARSE_ATTENTION_PAGE_DIR",
  "SPECIAL_TOKENS_GLOSSARY_PAGE_DIR",
  "STANDARD_FFN_GLOSSARY_PAGE_DIR",
  "SWIGLU_GLOSSARY_PAGE_DIR",
  "TANH_GLOSSARY_PAGE_DIR",
  "TOKEN_GLOSSARY_PAGE_DIR",
  "TOP_K_SAMPLING_GLOSSARY_PAGE_DIR",
  "TOP_P_SAMPLING_GLOSSARY_PAGE_DIR",
  "UNIGRAM_TOKENIZER_PAGE_DIR",
  "VECTOR_GLOSSARY_PAGE_DIR",
  "VOCABULARY_SIZE_GLOSSARY_PAGE_DIR",
  "WHY_LONG_CONTEXT_IS_HARD_CONCEPT_PAGE_DIR",
] as const;

const PAGE_DIR_EXPORT_PATTERN = /^export const (\w+_PAGE_DIR)\s*=/gm;

/** Collect exported `*_PAGE_DIR` constant names from a content-paths.ts source string. */
export function findExportedPageDirConstants(source: string): string[] {
  return [...source.matchAll(PAGE_DIR_EXPORT_PATTERN)]
    .map((match) => match[1])
    .sort();
}

/** Return page-directory exports that are not on the grandfathered allowlist. */
export function findNewOrdinaryPageDirExports(
  source: string,
  allowed: readonly string[] = ALLOWED_ORDINARY_PAGE_DIR_EXPORTS,
): string[] {
  const allowedNames = new Set(allowed);
  return findExportedPageDirConstants(source).filter(
    (name) => !allowedNames.has(name),
  );
}

/** Format a guard failure message that points callers at derived lookup. */
export function formatNewPageDirExportViolation(exports: string[]): string {
  const replacementExample = `getDocsPageDir("modules", "my-page-slug")`;

  return [
    "content-paths.ts exports new ordinary docs page directory constants:",
    ...exports.map((name) => `  - ${name}`),
    "",
    "Routine canonical pages should not add page-specific constants here.",
    `Compute page directories from section and slug instead, e.g. ${replacementExample}.`,
    "Shared roots and section roots (getDocsRoot, getDocsSectionRoot, get*DocsRoot) remain allowed.",
    "See getDocsPageDir in content-paths.ts.",
  ].join("\n");
}
