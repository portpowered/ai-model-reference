import {
  DOCS_COLLECTION_IDS,
  type DocsCollectionDefinition,
  type DocsCollectionId,
  type DocsCollectionMessageKeys,
} from "@/lib/docs/collection-definition-contract";

function collectionMessageKeys(
  browsePrefix: string,
  indexPrefix: string,
): DocsCollectionMessageKeys {
  return {
    browse: {
      sectionTitle: `browseIndex.${browsePrefix}SectionTitle`,
      sectionDescription: `browseIndex.${browsePrefix}SectionDescription`,
      sectionLinkLabel: `browseIndex.${browsePrefix}SectionLinkLabel`,
    },
    index: {
      title: `${indexPrefix}Index.title`,
      description: `${indexPrefix}Index.description`,
      listLabel: `${indexPrefix}Index.listLabel`,
      emptyTitle: `${indexPrefix}Index.emptyTitle`,
      emptyDescription: `${indexPrefix}Index.emptyDescription`,
      emptyHomeLink: `${indexPrefix}Index.emptyHomeLink`,
    },
  };
}

/**
 * Canonical AI docs collection inventory for later generic shell consumers.
 * Runtime browse, sidebar, and source slug matching remain on existing paths.
 */
export const DOCS_COLLECTION_DEFINITIONS = [
  {
    id: "glossary",
    routeSlug: "glossary",
    registryKind: "concept",
    frontmatterKind: "glossary",
    starterSlugs: [],
    messageKeys: collectionMessageKeys("glossary", "glossary"),
  },
  {
    id: "concepts",
    routeSlug: "concepts",
    registryKind: "concept",
    frontmatterKind: "concept",
    starterSlugs: [],
    messageKeys: collectionMessageKeys("concepts", "concepts"),
  },
  {
    id: "modules",
    routeSlug: "modules",
    registryKind: "module",
    frontmatterKind: "module",
    starterSlugs: [],
    messageKeys: collectionMessageKeys("modules", "modules"),
  },
  {
    id: "models",
    routeSlug: "models",
    registryKind: "model",
    frontmatterKind: "model",
    starterSlugs: [],
    messageKeys: collectionMessageKeys("models", "models"),
  },
  {
    id: "papers",
    routeSlug: "papers",
    registryKind: "paper",
    frontmatterKind: "paper",
    starterSlugs: [],
    messageKeys: collectionMessageKeys("papers", "papers"),
  },
  {
    id: "training",
    routeSlug: "training",
    registryKind: "training-regime",
    frontmatterKind: "training-regime",
    starterSlugs: [],
    messageKeys: collectionMessageKeys("training", "training"),
  },
  {
    id: "systems",
    routeSlug: "systems",
    registryKind: "system",
    frontmatterKind: "system",
    starterSlugs: [],
    messageKeys: collectionMessageKeys("systems", "systems"),
  },
] as const satisfies readonly DocsCollectionDefinition[];

export type DocsCollectionDefinitions = typeof DOCS_COLLECTION_DEFINITIONS;

const definitionsById = new Map<DocsCollectionId, DocsCollectionDefinition>(
  DOCS_COLLECTION_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getDocsCollectionDefinition(
  id: DocsCollectionId,
): DocsCollectionDefinition {
  const definition = definitionsById.get(id);
  if (!definition) {
    throw new Error(`Unknown docs collection id: ${id}`);
  }
  return definition;
}

export function listDocsCollectionDefinitions(): readonly DocsCollectionDefinition[] {
  return DOCS_COLLECTION_DEFINITIONS;
}

export function assertDocsCollectionInventory(): void {
  const ids = DOCS_COLLECTION_DEFINITIONS.map((definition) => definition.id);
  if (ids.length !== DOCS_COLLECTION_IDS.length) {
    throw new Error(
      `Expected ${DOCS_COLLECTION_IDS.length} collection definitions, found ${ids.length}`,
    );
  }

  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new Error("Duplicate docs collection ids in definition inventory");
  }

  for (const expectedId of DOCS_COLLECTION_IDS) {
    if (!uniqueIds.has(expectedId)) {
      throw new Error(
        `Missing docs collection definition for id: ${expectedId}`,
      );
    }
  }
}
