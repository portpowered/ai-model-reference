import {
  DOCS_COLLECTION_IDS,
  type DocsCollectionMessageKeys,
} from "@/lib/docs/collection-definition-contract";
import {
  assertDocsCollectionInventory,
  getDocsCollectionDefinition,
  listDocsCollectionDefinitions,
} from "@/lib/docs/docs-collection-definitions";

const GROUPED_STARTER_COLLECTION_ID = "modules" as const;
const GROUPED_STARTER_SLUG = "modules/grouped-query-attention" as const;

const UNGROUPED_STARTER_COLLECTION_ID = "models" as const;
const UNGROUPED_STARTER_SLUG = "models/gpt-3" as const;

function assertNonEmptyMessageKeyMetadata(
  collectionId: string,
  messageKeys: DocsCollectionMessageKeys,
): void {
  for (const path of [
    messageKeys.browse.sectionTitle,
    messageKeys.browse.sectionDescription,
    messageKeys.browse.sectionLinkLabel,
    messageKeys.index.title,
    messageKeys.index.description,
    messageKeys.index.listLabel,
    messageKeys.index.emptyTitle,
    messageKeys.index.emptyDescription,
    messageKeys.index.emptyHomeLink,
  ]) {
    if (typeof path !== "string" || path.length === 0) {
      throw new Error(
        `Collection ${collectionId} has empty message key metadata path`,
      );
    }
  }
}

function assertTrainingRouteSlugKindMapping(): void {
  const training = getDocsCollectionDefinition("training");
  if (training.routeSlug !== "training") {
    throw new Error(
      `Expected training route slug "training", found "${training.routeSlug}"`,
    );
  }
  if (training.frontmatterKind !== "training-regime") {
    throw new Error(
      `Expected training frontmatter kind "training-regime", found "${training.frontmatterKind}"`,
    );
  }
  if (training.registryKind !== "training-regime") {
    throw new Error(
      `Expected training registry kind "training-regime", found "${training.registryKind}"`,
    );
  }
}

function assertRepresentativeStarterSlugs(): void {
  const grouped = getDocsCollectionDefinition(GROUPED_STARTER_COLLECTION_ID);
  if (!grouped.starterSlugs.includes(GROUPED_STARTER_SLUG)) {
    throw new Error(
      `Grouped collection ${GROUPED_STARTER_COLLECTION_ID} is missing starter slug ${GROUPED_STARTER_SLUG}`,
    );
  }

  const ungrouped = getDocsCollectionDefinition(
    UNGROUPED_STARTER_COLLECTION_ID,
  );
  if (!ungrouped.starterSlugs.includes(UNGROUPED_STARTER_SLUG)) {
    throw new Error(
      `Ungrouped collection ${UNGROUPED_STARTER_COLLECTION_ID} is missing starter slug ${UNGROUPED_STARTER_SLUG}`,
    );
  }
}

/**
 * Behavioral verification that exported collection definitions match the
 * current AI docs collection contract without scanning source files.
 */
export function assertDocsCollectionDefinitionInventoryVerified(): void {
  assertDocsCollectionInventory();

  const definitions = listDocsCollectionDefinitions();
  if (definitions.length !== DOCS_COLLECTION_IDS.length) {
    throw new Error(
      `Expected ${DOCS_COLLECTION_IDS.length} collection definitions, found ${definitions.length}`,
    );
  }

  for (const definition of definitions) {
    if (definition.routeSlug.length === 0) {
      throw new Error(`Collection ${definition.id} has an empty route slug`);
    }
    if (definition.registryKind.length === 0) {
      throw new Error(`Collection ${definition.id} has an empty registry kind`);
    }
    if (definition.frontmatterKind.length === 0) {
      throw new Error(
        `Collection ${definition.id} has an empty frontmatter kind`,
      );
    }

    assertNonEmptyMessageKeyMetadata(definition.id, definition.messageKeys);

    if (definition.starterSlugs.length === 0) {
      throw new Error(`Collection ${definition.id} has no starter slugs`);
    }
    for (const slug of definition.starterSlugs) {
      if (!slug.startsWith(`${definition.routeSlug}/`)) {
        throw new Error(
          `Collection ${definition.id} starter slug "${slug}" is not route-relative to "${definition.routeSlug}"`,
        );
      }
    }
  }

  assertTrainingRouteSlugKindMapping();
  assertRepresentativeStarterSlugs();
}
