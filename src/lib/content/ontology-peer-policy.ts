import type { OntologyRelationship } from "@/lib/content/schemas";

export const ONTOLOGY_PEER_SOURCE_PRIORITY = [
  "direct-relationship",
  "classification-sibling",
  "shared-parent-classification",
] as const;

export type OntologyPeerSource = (typeof ONTOLOGY_PEER_SOURCE_PRIORITY)[number];

export const ONTOLOGY_DIRECT_RELATIONSHIP_PRIORITY = [
  "variant",
  "part-of",
  "explains",
  "uses",
  "used-by",
  "prerequisite",
  "related",
] as const satisfies readonly OntologyRelationship["relationshipType"][];

export type OntologyPeerRelationshipType =
  (typeof ONTOLOGY_DIRECT_RELATIONSHIP_PRIORITY)[number];

export const ONTOLOGY_RELATIONSHIPS_THAT_OUTRANK_CLASSIFICATION_SIBLINGS = [
  "variant",
  "part-of",
  "explains",
] as const satisfies readonly OntologyPeerRelationshipType[];

export const LEGACY_TAXONOMY_SIGNALS = [
  "variantGroup",
  "moduleFamily",
  "conceptType",
] as const;

export const ONTOLOGY_PEER_POLICY = {
  sourcePriority: ONTOLOGY_PEER_SOURCE_PRIORITY,
  directRelationshipPriority: ONTOLOGY_DIRECT_RELATIONSHIP_PRIORITY,
  relationshipsThatOutrankClassificationSiblings:
    ONTOLOGY_RELATIONSHIPS_THAT_OUTRANK_CLASSIFICATION_SIBLINGS,
  sharedParentFallbackRule:
    "Only use shared parent classification peers after direct relationships and same-classification siblings have been considered.",
  legacyTaxonomyRule:
    "Legacy taxonomy fields remain compatibility metadata and must not be the primary peer-discovery source when ontology ancestry exists.",
  deliberateImprovementCase: {
    oldBehavior:
      "Broad legacy conceptType buckets such as general can group semantically unrelated glossary pages together even when they do not share ontology adjacency or explicit relationships.",
    newBehavior:
      "Ontology-first peers require direct relationships, the same classification branch, or an explicit shared-parent fallback before records appear as nearby peers.",
    exampleRegistryIds: ["concept.foundation-model", "concept.temperature"],
  },
} as const;

export function ontologyRelationshipPriority(
  relationshipType: OntologyRelationship["relationshipType"],
): number {
  const index = ONTOLOGY_DIRECT_RELATIONSHIP_PRIORITY.indexOf(relationshipType);

  return index === -1 ? ONTOLOGY_DIRECT_RELATIONSHIP_PRIORITY.length : index;
}

export function relationshipOutranksClassificationSibling(
  relationshipType: OntologyRelationship["relationshipType"],
): boolean {
  return (
    ONTOLOGY_RELATIONSHIPS_THAT_OUTRANK_CLASSIFICATION_SIBLINGS as readonly string[]
  ).includes(relationshipType);
}
