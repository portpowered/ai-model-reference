import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
);

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

/** Glossary docs under `src/content/docs/glossary`. */
export function getGlossaryDocsRoot(docsRoot = getDocsRoot()): string {
  return join(docsRoot, "glossary");
}

/** Concept docs under `src/content/docs/concepts`. */
export function getConceptsDocsRoot(docsRoot = getDocsRoot()): string {
  return join(docsRoot, "concepts");
}

/** Module docs under `src/content/docs/modules`. */
export function getModulesDocsRoot(docsRoot = getDocsRoot()): string {
  return join(docsRoot, "modules");
}

/** Model docs under `src/content/docs/models`. */
export function getModelsDocsRoot(docsRoot = getDocsRoot()): string {
  return join(docsRoot, "models");
}

/** Paper docs under `src/content/docs/papers`. */
export function getPapersDocsRoot(docsRoot = getDocsRoot()): string {
  return join(docsRoot, "papers");
}

/** Training-regime docs under `src/content/docs/training`. */
export function getTrainingDocsRoot(docsRoot = getDocsRoot()): string {
  return join(docsRoot, "training");
}

/** System docs under `src/content/docs/systems`. */
export function getSystemsDocsRoot(docsRoot = getDocsRoot()): string {
  return join(docsRoot, "systems");
}

/** Registry JSON under `src/content/registry`. */
export function getRegistryRoot(contentRoot = getContentRoot()): string {
  return join(contentRoot, "registry");
}

/** Generated content runtime artifacts under `src/lib/content/generated`. */
export function getGeneratedContentRuntimeRoot(
  projectRoot = getProjectRoot(),
): string {
  return join(projectRoot, "src", "lib", "content", "generated");
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

/** Default generated content runtime artifact root. */
export const GENERATED_CONTENT_RUNTIME_ROOT = getGeneratedContentRuntimeRoot();

/** Default `src/content/messages` root. */
export const MESSAGES_ROOT = getMessagesRoot(contentRoot);

/** Default `src/content/registry/tags/messages` root. */
export const TAG_MESSAGES_ROOT = getTagMessagesRoot(REGISTRY_ROOT);

/** Phase 1 attention module bridge page directory. */
export const ATTENTION_MODULE_PAGE_DIR = join(MODULES_DOCS_ROOT, "attention");

/** Phase 1 grouped-query attention sample module page directory. */
export const GROUPED_QUERY_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "grouped-query-attention",
);

/** Phase 4 byte pair encoding module page directory. */
export const BPE_MODULE_PAGE_DIR = join(MODULES_DOCS_ROOT, "bpe");

/** Phase 4 SentencePiece module page directory. */
export const SENTENCEPIECE_MODULE_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "sentencepiece",
);

/** Phase 3 multi-head attention module page directory. */
export const MULTI_HEAD_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "multi-head-attention",
);

/** Phase 3 multi-query attention module page directory. */
export const MULTI_QUERY_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "multi-query-attention",
);

/** Phase 3 multi-head latent attention module page directory. */
export const MULTI_HEAD_LATENT_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "multi-head-latent-attention",
);

/** Phase 3 linear attention module page directory. */
export const LINEAR_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "linear-attention",
);

/** Phase 3 sliding-window attention module page directory. */
export const SLIDING_WINDOW_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "sliding-window-attention",
);

/** Phase 3 sparse attention module page directory. */
export const SPARSE_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "sparse-attention",
);

/** Byte-level tokenization module page directory. */
export const BYTE_LEVEL_TOKENIZATION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "byte-level-tokenization",
);

/** Phase 1 token glossary sample page directory. */
export const TOKEN_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "token");

/** Special tokens glossary page directory. */
export const SPECIAL_TOKENS_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "special-tokens",
);

/** Phase 1 vector glossary bridge page directory. */
export const VECTOR_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "vector");

/** Phase 1 hidden size glossary bridge page directory. */
export const HIDDEN_SIZE_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "hidden-size",
);

/** Vocabulary size glossary page directory. */
export const VOCABULARY_SIZE_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "vocabulary-size",
);

/** Phase 3 feed-forward network glossary page directory. */
export const FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "feed-forward-network",
);

/** Phase 3 standard FFN glossary page directory. */
export const STANDARD_FFN_GLOSSARY_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "standard-ffn",
);

/** Phase 3 mixture of experts glossary page directory. */
export const MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "mixture-of-experts",
);

/** Phase 3 normalization glossary page directory. */
export const NORMALIZATION_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "normalization",
);

/** Phase 3 batch norm glossary page directory. */
export const BATCH_NORM_GLOSSARY_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "batch-norm",
);

/** Phase 3 group norm glossary page directory. */
export const GROUP_NORM_GLOSSARY_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "group-norm",
);

/** Phase 3 layer norm glossary page directory. */
export const LAYER_NORM_GLOSSARY_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "layer-norm",
);

/** Phase 3 ReLU glossary page directory. */
export const RELU_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "relu");

/** Phase 3 LeakyReLU glossary page directory. */
export const LEAKY_RELU_GLOSSARY_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "leaky-relu",
);

/** Phase 3 SiLU glossary page directory. */
export const SILU_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "silu");

/** Phase 3 sigmoid activation glossary page directory. */
export const SIGMOID_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "sigmoid");

/** Phase 3 tanh activation glossary page directory. */
export const TANH_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "tanh");

/** Phase 3 SwiGLU glossary page directory. */
export const SWIGLU_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "swiglu");

/** Phase 3 RMSNorm glossary page directory. */
export const RMSNORM_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "rmsnorm");

/** Phase 3 QK norm glossary page directory. */
export const QK_NORM_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "qk-norm");

/** Phase 3 residual connection glossary page directory. */
export const RESIDUAL_CONNECTION_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "residual-connection",
);

/** Phase 3 skip connection glossary page directory. */
export const SKIP_CONNECTION_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "skip-connection",
);

/** Phase 3 positional encodings concept page directory. */
export const POSITIONAL_ENCODINGS_CONCEPT_PAGE_DIR = join(
  CONCEPTS_DOCS_ROOT,
  "positional-encodings",
);

/** ALiBi concept page directory. */
export const ALIBI_CONCEPT_PAGE_DIR = join(CONCEPTS_DOCS_ROOT, "alibi");

/** Phase 3 RoPE glossary page directory. */
export const ROPE_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "rope");

/** Phase 3 ALiBi glossary page directory. */
export const ALIBI_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "alibi");

/** Phase 3 context window glossary page directory. */
export const CONTEXT_WINDOW_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "context-window",
);

/** Phase 5 KV cache glossary page directory. */
export const KV_CACHE_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "kv-cache");

/** Phase 5 prefill glossary page directory. */
export const PREFILL_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "prefill");

/** Phase 5 decode glossary page directory. */
export const DECODE_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "decode");

/** Phase 5 prefill/decode split glossary page directory. */
export const PREFILL_DECODE_SPLIT_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "prefill-decode-split",
);

/** Phase 5 sampling overview glossary page directory. */
export const SAMPLING_OVERVIEW_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "sampling-overview",
);

/** Phase 5 greedy decoding glossary page directory. */
export const GREEDY_DECODING_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "greedy-decoding",
);

/** Phase 5 top-k sampling glossary page directory. */
export const TOP_K_SAMPLING_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "top-k-sampling",
);

/** Phase 5 top-p sampling glossary page directory. */
export const TOP_P_SAMPLING_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "top-p-sampling",
);

/** Phase 3 context extension concept page directory. */
export const CONTEXT_EXTENSION_CONCEPT_PAGE_DIR = join(
  CONCEPTS_DOCS_ROOT,
  "context-extension",
);

/** Phase 3 why long context is hard concept page directory. */
export const WHY_LONG_CONTEXT_IS_HARD_CONCEPT_PAGE_DIR = join(
  CONCEPTS_DOCS_ROOT,
  "why-long-context-is-hard",
);
