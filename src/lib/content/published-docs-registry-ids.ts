/** Registry ids for docs pages with `status: published` in frontmatter. */
export const PUBLISHED_DOCS_REGISTRY_IDS = new Set<string>([
  "module.grouped-query-attention",
  "concept.token",
  "concept.embedding",
  "concept.tensor",
  "concept.model",
  "concept.architecture",
  "concept.module",
  "concept.component",
  "concept.modality",
  "concept.foundation-model",
  "concept.generative-model",
  "concept.discriminative-model",
  "concept.representation",
]);

export type PublishedDocsRegistryIds = ReadonlySet<string>;
