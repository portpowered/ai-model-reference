import { describe, expect, test } from "bun:test";
import {
  LEGACY_TAXONOMY_SIGNALS,
  ONTOLOGY_DIRECT_RELATIONSHIP_PRIORITY,
  ONTOLOGY_PEER_POLICY,
  ONTOLOGY_PEER_SOURCE_PRIORITY,
  ONTOLOGY_RELATIONSHIPS_THAT_OUTRANK_CLASSIFICATION_SIBLINGS,
  ontologyRelationshipPriority,
  relationshipOutranksClassificationSibling,
} from "@/lib/content/ontology-peer-policy";

describe("ontology peer policy", () => {
  test("documents source precedence across related docs and search", () => {
    expect(ONTOLOGY_PEER_SOURCE_PRIORITY).toEqual([
      "direct-relationship",
      "classification-sibling",
      "shared-parent-classification",
    ]);
    expect(ONTOLOGY_PEER_POLICY.sourcePriority).toEqual(
      ONTOLOGY_PEER_SOURCE_PRIORITY,
    );
  });

  test("prioritizes explicit ontology relationships before generic siblings", () => {
    expect(ONTOLOGY_DIRECT_RELATIONSHIP_PRIORITY).toEqual([
      "variant",
      "part-of",
      "explains",
      "uses",
      "used-by",
      "prerequisite",
      "related",
    ]);
    expect(ONTOLOGY_RELATIONSHIPS_THAT_OUTRANK_CLASSIFICATION_SIBLINGS).toEqual(
      ["variant", "part-of", "explains"],
    );
    expect(relationshipOutranksClassificationSibling("variant")).toBe(true);
    expect(relationshipOutranksClassificationSibling("part-of")).toBe(true);
    expect(relationshipOutranksClassificationSibling("explains")).toBe(true);
    expect(relationshipOutranksClassificationSibling("uses")).toBe(false);
    expect(ontologyRelationshipPriority("variant")).toBeLessThan(
      ontologyRelationshipPriority("used-by"),
    );
    expect(ontologyRelationshipPriority("explains")).toBeLessThan(
      ontologyRelationshipPriority("related"),
    );
  });

  test("records legacy taxonomy as compatibility-only metadata", () => {
    expect(LEGACY_TAXONOMY_SIGNALS).toEqual([
      "variantGroup",
      "moduleFamily",
      "conceptType",
    ]);
    expect(ONTOLOGY_PEER_POLICY.legacyTaxonomyRule).toContain(
      "must not be the primary peer-discovery source",
    );
  });

  test("captures a deliberate improvement over broad legacy buckets", () => {
    expect(ONTOLOGY_PEER_POLICY.deliberateImprovementCase).toEqual({
      oldBehavior:
        "Broad legacy conceptType buckets such as general can group semantically unrelated glossary pages together even when they do not share ontology adjacency or explicit relationships.",
      newBehavior:
        "Ontology-first peers require direct relationships, the same classification branch, or an explicit shared-parent fallback before records appear as nearby peers.",
      exampleRegistryIds: ["concept.foundation-model", "concept.temperature"],
    });
  });
});
