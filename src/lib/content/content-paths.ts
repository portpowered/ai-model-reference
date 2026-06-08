import { join } from "node:path";

/** Repository root when Next.js or Bun runs from the project directory. */
export function getProjectRoot(): string {
  return process.cwd();
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

/** Default `src/content/registry` root. */
export const REGISTRY_ROOT = getRegistryRoot(contentRoot);

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

/** Phase 1 token glossary sample page directory. */
export const TOKEN_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "token");

/** Phase 1 vector glossary bridge page directory. */
export const VECTOR_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "vector");

/** Phase 1 hidden size glossary bridge page directory. */
export const HIDDEN_SIZE_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "hidden-size",
);

/** Phase 3 feed-forward network glossary page directory. */
export const FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "feed-forward-network",
);

/** Phase 3 mixture of experts glossary page directory. */
export const MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "mixture-of-experts",
);

/** Phase 3 normalization glossary page directory. */
export const NORMALIZATION_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "normalization",
);

/** Phase 3 layer norm glossary page directory. */
export const LAYER_NORM_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "layer-norm",
);

/** Phase 3 RMSNorm glossary page directory. */
export const RMSNORM_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "rmsnorm");

/** Phase 3 residual connection glossary page directory. */
export const RESIDUAL_CONNECTION_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "residual-connection",
);

/** Phase 3 positional encodings concept page directory. */
export const POSITIONAL_ENCODINGS_CONCEPT_PAGE_DIR = join(
  CONCEPTS_DOCS_ROOT,
  "positional-encodings",
);

/** Phase 3 RoPE glossary page directory. */
export const ROPE_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "rope");

/** Phase 3 ALiBi glossary page directory. */
export const ALIBI_GLOSSARY_PAGE_DIR = join(GLOSSARY_DOCS_ROOT, "alibi");

/** Phase 3 context window glossary page directory. */
export const CONTEXT_WINDOW_GLOSSARY_PAGE_DIR = join(
  GLOSSARY_DOCS_ROOT,
  "context-window",
);
