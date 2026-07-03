/**
 * Canonical filesystem paths for committed content and generated runtime artifacts.
 *
 * **Derived page directory contract.** Ordinary canonical docs pages live under
 * `src/content/docs/<section>/<slug>`. Callers should resolve a page directory with
 * {@link getDocsPageDir} from a {@link DocsSection} and slug instead of importing
 * page-specific exported constants. Shared roots ({@link getDocsRoot},
 * {@link getRegistryRoot}, {@link getMessagesRoot}, generated roots) and section
 * roots ({@link getDocsSectionRoot}, `get*DocsRoot`) remain the stable surface for
 * section-wide or tree-wide operations.
 */
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

/** Narrative blog posts under `src/content/blog`. */
export function getBlogRoot(contentRoot = getContentRoot()): string {
  return join(contentRoot, "blog");
}

/** Blog post bundle under `src/content/blog/<slug>`. */
export function getBlogPageDir(slug: string, blogRoot = getBlogRoot()): string {
  return join(blogRoot, slug);
}

/** Supported canonical docs sections under `src/content/docs`. */
export const DOCS_SECTIONS = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
] as const;

/** Canonical docs section identifier for derived page directory lookup. */
export type DocsSection = (typeof DOCS_SECTIONS)[number];

/** Supported docs sections keyed to the canonical content tree. */
const docsSectionPaths: Record<DocsSection, string> = {
  glossary: "glossary",
  concepts: "concepts",
  modules: "modules",
  models: "models",
  papers: "papers",
  training: "training",
  systems: "systems",
};

/** Docs section root under `src/content/docs/<section>`. */
export function getDocsSectionRoot(
  section: DocsSection,
  docsRoot = getDocsRoot(),
): string {
  return join(docsRoot, docsSectionPaths[section]);
}

/**
 * Derived docs page directory under `src/content/docs/<section>/<slug>`.
 *
 * Use this for ordinary canonical page bundles (model, concept, module, system,
 * paper, training, or glossary). Do not add new page-specific exported constants
 * for routine page additions; pass the section and slug here instead.
 */
export function getDocsPageDir(
  section: DocsSection,
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

export const REGISTRY_COLLECTIONS = [
  "citations",
  "classifications",
  "concepts",
  "datasets",
  "graphs",
  "models",
  "modules",
  "organizations",
  "papers",
  "systems",
  "tables",
  "tags",
  "training-regimes",
] as const;

export type RegistryCollection = (typeof REGISTRY_COLLECTIONS)[number];

/** Supported registry collection root under `src/content/registry/<collection>`. */
export function getRegistryCollectionRoot(
  collection: RegistryCollection,
  registryRoot = getRegistryRoot(),
): string {
  return join(registryRoot, collection);
}

/** Generated content runtime artifacts under `src/lib/content/generated`. */
export function getGeneratedContentRuntimeRoot(
  projectRoot = getProjectRoot(),
): string {
  return join(projectRoot, "src", "lib", "content", "generated");
}

/** Generated Fumadocs bindings under `.source`. */
export function getGeneratedDocsSourceRoot(
  projectRoot = getProjectRoot(),
): string {
  return join(projectRoot, ".source");
}

/** Site-wide UI messages under `src/content/messages`. */
export function getMessagesRoot(contentRoot = getContentRoot()): string {
  return join(contentRoot, "messages");
}

/** Localized tag copy under `src/content/registry/tags/messages`. */
export function getTagMessagesRoot(registryRoot = getRegistryRoot()): string {
  return join(getRegistryCollectionRoot("tags", registryRoot), "messages");
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

/** Default generated Fumadocs bindings root. */
export const GENERATED_DOCS_SOURCE_ROOT = getGeneratedDocsSourceRoot();

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

/** Local attention module page directory. */
export const LOCAL_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "local-attention",
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

/** Block-sparse attention module page directory. */
export const BLOCK_SPARSE_ATTENTION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "block-sparse-attention",
);

/** Byte-level tokenization module page directory. */
export const BYTE_LEVEL_TOKENIZATION_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "byte-level-tokenization",
);

/** Tokenization module page directory. */
export const UNIGRAM_TOKENIZER_PAGE_DIR = join(
  MODULES_DOCS_ROOT,
  "unigram-tokenizer",
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

/** Prefill concept page directory. */
export const PREFILL_CONCEPT_PAGE_DIR = join(CONCEPTS_DOCS_ROOT, "prefill");

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

/** Phase 3 GELU activation glossary page directory. */
export const GELU_GLOSSARY_PAGE_DIR = join(MODULES_DOCS_ROOT, "gelu");

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
