import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
);

export const DOCS_SECTION_NAMES = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
] as const;

export type DocsSectionName = (typeof DOCS_SECTION_NAMES)[number];

/** Repository root inferred from this module so helper imports remain stable outside repo cwd. */
export function getProjectRoot(): string {
  return REPO_ROOT;
}

/** Committed content tree root (`src/content`). */
export function getContentRoot(projectRoot = getProjectRoot()): string {
  return join(projectRoot, "src/content");
}

/** Published docs pages under `src/content/docs`. */
export function getDocsRoot(contentRoot = getContentRoot()): string {
  return join(contentRoot, "docs");
}

/** Published docs section root under `src/content/docs/<section>`. */
export function getDocsSectionRoot(
  section: DocsSectionName,
  docsRoot = getDocsRoot(),
): string {
  return join(docsRoot, section);
}

/** Published docs page directory under `src/content/docs/<section>/<slug>`. */
export function getDocsPageDir(
  section: DocsSectionName,
  slug: string,
  docsRoot = getDocsRoot(),
): string {
  return join(getDocsSectionRoot(section, docsRoot), slug);
}

/** Glossary docs under `src/content/docs/glossary`. */
export function getGlossaryDocsRoot(docsRoot = getDocsRoot()): string {
  return getDocsSectionRoot("glossary", docsRoot);
}

/** Concept docs under `src/content/docs/concepts`. */
export function getConceptsDocsRoot(docsRoot = getDocsRoot()): string {
  return getDocsSectionRoot("concepts", docsRoot);
}

/** Module docs under `src/content/docs/modules`. */
export function getModulesDocsRoot(docsRoot = getDocsRoot()): string {
  return getDocsSectionRoot("modules", docsRoot);
}

/** Model docs under `src/content/docs/models`. */
export function getModelsDocsRoot(docsRoot = getDocsRoot()): string {
  return getDocsSectionRoot("models", docsRoot);
}

/** Paper docs under `src/content/docs/papers`. */
export function getPapersDocsRoot(docsRoot = getDocsRoot()): string {
  return getDocsSectionRoot("papers", docsRoot);
}

/** Training-regime docs under `src/content/docs/training`. */
export function getTrainingDocsRoot(docsRoot = getDocsRoot()): string {
  return getDocsSectionRoot("training", docsRoot);
}

/** System docs under `src/content/docs/systems`. */
export function getSystemsDocsRoot(docsRoot = getDocsRoot()): string {
  return getDocsSectionRoot("systems", docsRoot);
}

/** Registry JSON under `src/content/registry`. */
export function getRegistryRoot(contentRoot = getContentRoot()): string {
  return join(contentRoot, "registry");
}

/** Site-wide UI messages under `src/content/messages`. */
export function getMessagesRoot(contentRoot = getContentRoot()): string {
  return join(contentRoot, "messages");
}

/** Localized tag copy under `src/content/registry/tags/messages`. */
export function getTagMessagesRoot(registryRoot = getRegistryRoot()): string {
  return join(registryRoot, "tags", "messages");
}

const contentRoot = getContentRoot();

/** Default `src/content` root for production loaders. */
export const CONTENT_ROOT = contentRoot;

/** Default `src/content/docs` root for page discovery. */
export const DOCS_ROOT = getDocsRoot(contentRoot);

/** Default `src/content/docs/glossary` root. */
export const GLOSSARY_DOCS_ROOT = getGlossaryDocsRoot(DOCS_ROOT);

/** Default `src/content/docs/concepts` root. */
export const CONCEPTS_DOCS_ROOT = getConceptsDocsRoot(DOCS_ROOT);

/** Default `src/content/docs/modules` root. */
export const MODULES_DOCS_ROOT = getModulesDocsRoot(DOCS_ROOT);

/** Default `src/content/docs/models` root. */
export const MODELS_DOCS_ROOT = getModelsDocsRoot(DOCS_ROOT);

/** Default `src/content/docs/papers` root. */
export const PAPERS_DOCS_ROOT = getPapersDocsRoot(DOCS_ROOT);

/** Default `src/content/docs/training` root. */
export const TRAINING_DOCS_ROOT = getTrainingDocsRoot(DOCS_ROOT);

/** Default `src/content/docs/systems` root. */
export const SYSTEMS_DOCS_ROOT = getSystemsDocsRoot(DOCS_ROOT);

/** Default `src/content/registry` root. */
export const REGISTRY_ROOT = getRegistryRoot(contentRoot);

/** Default `src/content/messages` root. */
export const MESSAGES_ROOT = getMessagesRoot(contentRoot);

/** Default `src/content/registry/tags/messages` root. */
export const TAG_MESSAGES_ROOT = getTagMessagesRoot(REGISTRY_ROOT);

/** Compatibility aliases for existing call sites. Prefer `getDocsPageDir()` for new work. */
export const ATTENTION_MODULE_PAGE_DIR = getDocsPageDir(
  "modules",
  "attention",
  DOCS_ROOT,
);
export const GROUPED_QUERY_ATTENTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "grouped-query-attention",
  DOCS_ROOT,
);
export const BPE_MODULE_PAGE_DIR = getDocsPageDir("modules", "bpe", DOCS_ROOT);
export const MULTI_HEAD_ATTENTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "multi-head-attention",
  DOCS_ROOT,
);
export const MULTI_QUERY_ATTENTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "multi-query-attention",
  DOCS_ROOT,
);
export const MULTI_HEAD_LATENT_ATTENTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "multi-head-latent-attention",
  DOCS_ROOT,
);
export const LINEAR_ATTENTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "linear-attention",
  DOCS_ROOT,
);
export const SLIDING_WINDOW_ATTENTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "sliding-window-attention",
  DOCS_ROOT,
);
export const SPARSE_ATTENTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "sparse-attention",
  DOCS_ROOT,
);
export const BYTE_LEVEL_TOKENIZATION_PAGE_DIR = getDocsPageDir(
  "modules",
  "byte-level-tokenization",
  DOCS_ROOT,
);
export const TOKEN_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "token",
  DOCS_ROOT,
);
export const SPECIAL_TOKENS_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "special-tokens",
  DOCS_ROOT,
);
export const VECTOR_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "vector",
  DOCS_ROOT,
);
export const HIDDEN_SIZE_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "hidden-size",
  DOCS_ROOT,
);
export const VOCABULARY_SIZE_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "vocabulary-size",
  DOCS_ROOT,
);
export const FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "feed-forward-network",
  DOCS_ROOT,
);
export const STANDARD_FFN_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "standard-ffn",
  DOCS_ROOT,
);
export const MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "mixture-of-experts",
  DOCS_ROOT,
);
export const NORMALIZATION_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "normalization",
  DOCS_ROOT,
);
export const BATCH_NORM_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "batch-norm",
  DOCS_ROOT,
);
export const GROUP_NORM_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "group-norm",
  DOCS_ROOT,
);
export const LAYER_NORM_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "layer-norm",
  DOCS_ROOT,
);
export const RELU_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "relu",
  DOCS_ROOT,
);
export const LEAKY_RELU_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "leaky-relu",
  DOCS_ROOT,
);
export const SILU_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "silu",
  DOCS_ROOT,
);
export const SWIGLU_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "swiglu",
  DOCS_ROOT,
);
export const RMSNORM_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "rmsnorm",
  DOCS_ROOT,
);
export const QK_NORM_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "qk-norm",
  DOCS_ROOT,
);
export const RESIDUAL_CONNECTION_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "residual-connection",
  DOCS_ROOT,
);
export const SKIP_CONNECTION_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "skip-connection",
  DOCS_ROOT,
);
export const POSITIONAL_ENCODINGS_CONCEPT_PAGE_DIR = getDocsPageDir(
  "concepts",
  "positional-encodings",
  DOCS_ROOT,
);
export const ALIBI_CONCEPT_PAGE_DIR = getDocsPageDir(
  "concepts",
  "alibi",
  DOCS_ROOT,
);
export const ROPE_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "rope",
  DOCS_ROOT,
);
export const ALIBI_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "modules",
  "alibi",
  DOCS_ROOT,
);
export const CONTEXT_WINDOW_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "context-window",
  DOCS_ROOT,
);
export const KV_CACHE_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "kv-cache",
  DOCS_ROOT,
);
export const PREFILL_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "prefill",
  DOCS_ROOT,
);
export const DECODE_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "decode",
  DOCS_ROOT,
);
export const PREFILL_DECODE_SPLIT_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "prefill-decode-split",
  DOCS_ROOT,
);
export const SAMPLING_OVERVIEW_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "sampling-overview",
  DOCS_ROOT,
);
export const GREEDY_DECODING_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "greedy-decoding",
  DOCS_ROOT,
);
export const TOP_K_SAMPLING_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "top-k-sampling",
  DOCS_ROOT,
);
export const TOP_P_SAMPLING_GLOSSARY_PAGE_DIR = getDocsPageDir(
  "glossary",
  "top-p-sampling",
  DOCS_ROOT,
);
export const CONTEXT_EXTENSION_CONCEPT_PAGE_DIR = getDocsPageDir(
  "concepts",
  "context-extension",
  DOCS_ROOT,
);
export const WHY_LONG_CONTEXT_IS_HARD_CONCEPT_PAGE_DIR = getDocsPageDir(
  "concepts",
  "why-long-context-is-hard",
  DOCS_ROOT,
);
