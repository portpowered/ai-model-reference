import { describe, expect, test } from "bun:test";
import {
  CURATED_RELATED,
  deriveCuratedRelatedItems,
  deriveRelatedDocGroups,
  deriveSameConceptTypePeers,
  deriveSameVariantGroupPeers,
  deriveSharedTagPeers,
  hasPublishedDocsPage,
  isPlannedRelatedTarget,
  PLANNED_RELATED_REASON_LABEL,
  registryDisplayTitle,
  SAME_CONCEPT_TYPE,
  SAME_VARIANT_GROUP,
  SHARED_TAGS,
} from "@/lib/content/related-docs";
import type { ConceptRecord, ModuleRecord } from "@/lib/content/schemas";

const publishedRegistryIds = new Set([
  "module.grouped-query-attention",
  "concept.token",
]);

const gqa: ModuleRecord = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  kind: "module",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GQA"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  moduleType: "attention",
  variantGroup: "attention-head-sharing",
  optimizes: [],
  practicalBenefits: [],
  exampleModelIds: [],
  improvesOnIds: [],
  tradeoffIds: [],
  usedByModelIds: [],
  introducedByPaperIds: [],
  mathLevel: "light",
};

const mqa: ModuleRecord = {
  ...gqa,
  id: "module.multi-query-attention",
  slug: "multi-query-attention",
  aliases: ["MQA"],
  variantGroup: "attention-head-sharing",
};

const mha: ModuleRecord = {
  ...gqa,
  id: "module.multi-head-attention",
  slug: "multi-head-attention",
  aliases: ["MHA"],
  variantGroup: "attention-head-sharing",
};

const sparse: ModuleRecord = {
  ...gqa,
  id: "module.sparse-attention",
  slug: "sparse-attention",
  aliases: ["Sparse attention"],
  variantGroup: "sparse-patterns",
};

const token: ConceptRecord = {
  id: "concept.token",
  slug: "token",
  kind: "concept",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["Token"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  conceptType: "architecture",
  prerequisiteIds: [],
  explainsIds: [],
};

const draftTransformer: ConceptRecord = {
  ...token,
  id: "concept.transformer",
  slug: "transformer",
  aliases: ["Transformer"],
  status: "draft",
  relatedIds: [],
};

describe("registryDisplayTitle", () => {
  test("returns the first alias when present on a module record", () => {
    expect(registryDisplayTitle(gqa)).toBe("GQA");
  });

  test("formats slug as title when module aliases are empty", () => {
    const noAlias: ModuleRecord = {
      ...gqa,
      aliases: [],
    };
    expect(registryDisplayTitle(noAlias)).toBe("Grouped Query Attention");
  });

  test("prefers alias and falls back to formatted slug for concept records", () => {
    expect(registryDisplayTitle(token)).toBe("Token");

    const noAlias: ConceptRecord = {
      ...token,
      slug: "attention-mechanism",
      aliases: [],
    };
    expect(registryDisplayTitle(noAlias)).toBe("Attention Mechanism");
  });
});

describe("related-docs", () => {
  test("hasPublishedDocsPage and isPlannedRelatedTarget follow published docs set", () => {
    expect(hasPublishedDocsPage(token, publishedRegistryIds)).toBe(true);
    expect(isPlannedRelatedTarget(draftTransformer, publishedRegistryIds)).toBe(
      true,
    );
    expect(isPlannedRelatedTarget(token, publishedRegistryIds)).toBe(false);
  });

  test("deriveSameVariantGroupPeers selects peers and excludes self", () => {
    const peers = deriveSameVariantGroupPeers(
      gqa,
      [gqa, mqa, mha, sparse],
      publishedRegistryIds,
    );
    expect(peers.map((item) => item.registryId)).toEqual([
      "module.multi-head-attention",
      "module.multi-query-attention",
    ]);
    expect(
      peers.every((item) => item.reasonLabel === "Same variant group"),
    ).toBe(true);
    expect(peers.every((item) => item.href?.includes("/docs/modules/"))).toBe(
      true,
    );
  });

  test("deriveSameVariantGroupPeers returns empty when source has no variantGroup", () => {
    const noGroup = { ...gqa, variantGroup: undefined };
    expect(
      deriveSameVariantGroupPeers(noGroup, [mqa, mha], publishedRegistryIds),
    ).toEqual([]);
  });

  test("deriveSharedTagPeers links modules and concepts with overlapping tags", () => {
    const peers = deriveSharedTagPeers(
      token,
      [gqa, mqa, mha, sparse],
      publishedRegistryIds,
    );
    expect(peers.map((item) => item.registryId)).toEqual([
      "module.grouped-query-attention",
      "module.multi-head-attention",
      "module.multi-query-attention",
      "module.sparse-attention",
    ]);
    expect(peers.every((item) => item.reasonLabel === "Shared tag")).toBe(true);
    expect(peers[0]?.href).toBe("/docs/modules/grouped-query-attention");
  });

  test("deriveSameConceptTypePeers marks draft peers as planned without href", () => {
    const peers = deriveSameConceptTypePeers(
      token,
      [token, draftTransformer, gqa],
      publishedRegistryIds,
    );
    expect(peers).toHaveLength(1);
    expect(peers[0]?.registryId).toBe("concept.transformer");
    expect(peers[0]?.href).toBeUndefined();
    expect(peers[0]?.isPlanned).toBe(true);
    expect(peers[0]?.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);
  });

  test("deriveSameConceptTypePeers links published peers with reason labels", () => {
    const publishedPeer: ConceptRecord = {
      ...draftTransformer,
      id: "concept.architecture",
      slug: "architecture",
      aliases: ["Architecture"],
      status: "published",
    };
    const publishedIds = new Set([
      ...publishedRegistryIds,
      "concept.architecture",
    ]);
    const peers = deriveSameConceptTypePeers(
      token,
      [token, publishedPeer],
      publishedIds,
    );
    expect(peers).toHaveLength(1);
    expect(peers[0]?.href).toBe("/docs/glossary/architecture");
    expect(peers[0]?.reasonLabel).toBe("Same concept type");
    expect(peers[0]?.isPlanned).toBe(false);
  });

  test("deriveCuratedRelatedItems preserves relatedIds order and planned draft rows", () => {
    const source: ConceptRecord = {
      ...token,
      relatedIds: [
        "concept.transformer",
        "concept.token",
        "module.grouped-query-attention",
      ],
    };
    const items = deriveCuratedRelatedItems(
      source,
      [token, draftTransformer, gqa],
      publishedRegistryIds,
    );
    expect(items.map((item) => item.registryId)).toEqual([
      "concept.transformer",
      "module.grouped-query-attention",
    ]);
    expect(items[0]?.isPlanned).toBe(true);
    expect(items[0]?.href).toBeUndefined();
    expect(items[1]?.href).toBe("/docs/modules/grouped-query-attention");
  });

  test("deriveRelatedDocGroups omits empty groups and ignores unsupported ids", () => {
    const groups = deriveRelatedDocGroups(
      gqa,
      [gqa, mqa, mha],
      [SAME_VARIANT_GROUP, "used-by-models", CURATED_RELATED],
      publishedRegistryIds,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe(SAME_VARIANT_GROUP);
    expect(groups[0]?.items).toHaveLength(2);
  });

  test("deriveRelatedDocGroups returns shared-tags for concept sources", () => {
    const groups = deriveRelatedDocGroups(
      token,
      [token, gqa, mqa, mha, draftTransformer],
      [SHARED_TAGS, SAME_CONCEPT_TYPE],
      publishedRegistryIds,
    );

    expect(groups.map((group) => group.id)).toEqual([
      SHARED_TAGS,
      SAME_CONCEPT_TYPE,
    ]);
    const plannedGroup = groups.find((group) => group.id === SAME_CONCEPT_TYPE);
    expect(plannedGroup?.items[0]?.isPlanned).toBe(true);
  });

  test("deriveRelatedDocGroups returns nothing when no peers match", () => {
    expect(
      deriveRelatedDocGroups(
        gqa,
        [gqa],
        [SAME_VARIANT_GROUP],
        publishedRegistryIds,
      ),
    ).toEqual([]);
  });
});
