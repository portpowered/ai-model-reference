import { describe, expect, test } from "bun:test";
import {
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  CLASSIFICATION_SIBLINGS,
  COMPATIBILITY_RELATED_DOC_GROUP_IDS,
  COMPATIBILITY_SAME_CONCEPT_TYPE,
  COMPATIBILITY_SAME_VARIANT_GROUP,
  CURATED_RELATED,
  DIRECT_RELATIONSHIPS,
  deriveClassificationSiblingPeers,
  deriveCuratedRelatedItems,
  deriveDirectRelationshipPeers,
  deriveRelatedDocGroups,
  deriveSameConceptTypePeers,
  deriveSameVariantGroupPeers,
  deriveSharedParentClassificationPeers,
  deriveSharedTagPeers,
  excludeRelatedDocItems,
  hasPublishedDocsPage,
  isPlannedRelatedTarget,
  ONTOLOGY_RELATED_DOC_GROUP_IDS,
  PLANNED_RELATED_REASON_LABEL,
  registryDisplayTitle,
  SAME_CONCEPT_TYPE,
  SAME_VARIANT_GROUP,
  SHARED_PARENT_CLASSIFICATION,
  SHARED_TAGS,
} from "@/lib/content/related-docs";
import type {
  ConceptRecord,
  ModelRecord,
  ModuleRecord,
} from "@/lib/content/schemas";

const publishedRegistryIds = new Set([
  "module.grouped-query-attention",
  "module.multi-head-attention",
  "module.multi-query-attention",
  "module.sparse-attention",
  "module.byte-level-tokenization",
  "module.learned-positional-embeddings",
  "concept.token",
  "concept.learned-positional-embeddings",
  "model.gpt-3",
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

const byteLevelTokenization: ModuleRecord = {
  ...gqa,
  id: "module.byte-level-tokenization",
  slug: "byte-level-tokenization",
  aliases: ["Byte-Level Tokenization"],
  tags: ["tokenization"],
  relatedIds: ["concept.token", "model.gpt-3"],
  citationIds: ["citation.gpt-2-report"],
  moduleType: "tokenizer",
  moduleFamily: "tokenization",
  conceptType: "tokenizer-algorithm",
  variantGroup: "subword-tokenizers",
  optimizes: ["arbitrary-text-coverage"],
  exampleModelIds: ["model.gpt-3"],
  usedByModelIds: ["model.gpt-3"],
  mathLevel: "none",
  releaseDate: "2019-02-14",
  authors: ["Alec Radford"],
  sourceId: "citation.gpt-2-report",
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

const gpt3: ModelRecord = {
  id: "model.gpt-3",
  slug: "gpt-3",
  kind: "model",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GPT-3"],
  tags: ["attention"],
  relatedIds: [
    "module.multi-head-attention",
    "module.learned-positional-embeddings",
  ],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z",
  family: "gpt",
  sourceType: "closed",
  modalities: ["text"],
  architectureIds: [],
  moduleIds: [
    "module.multi-head-attention",
    "module.learned-positional-embeddings",
  ],
  trainingRegimeIds: [],
  datasetIds: [],
  paperIds: [],
};

const learnedPositionalEmbeddingsModule: ModuleRecord = {
  ...gqa,
  id: "module.learned-positional-embeddings",
  slug: "learned-positional-embeddings",
  aliases: ["Learned positional embeddings"],
  variantGroup: "absolute-positional-encodings",
};

const learnedPositionalEmbeddingsConcept: ConceptRecord = {
  ...token,
  id: "concept.learned-positional-embeddings",
  slug: "learned-positional-embeddings",
  aliases: ["Learned positional embeddings"],
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
      peers.every(
        (item) => item.reasonLabel === "Compatibility: same variant group",
      ),
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
    expect(peers[0]?.reasonLabel).toBe("Compatibility: same concept type");
    expect(peers[0]?.isPlanned).toBe(false);
  });

  test("applyRelatedDocMessageOverrides replaces curated reason labels from page messages", () => {
    const source: ConceptRecord = {
      ...token,
      relatedIds: ["module.grouped-query-attention"],
    };
    const items = deriveCuratedRelatedItems(
      source,
      [source, gqa],
      publishedRegistryIds,
    );
    const overridden = applyRelatedDocMessageOverrides(items, {
      relatedDocs: {
        "module.grouped-query-attention": {
          reason:
            "Grouped-query attention shares KV heads across query groups.",
        },
      },
    });

    expect(overridden[0]?.reasonLabel).toBe(
      "Grouped-query attention shares KV heads across query groups.",
    );
    expect(
      applyRelatedDocMessageOverrides(items, undefined).map(
        (item) => item.reasonLabel,
      ),
    ).toEqual(items.map((item) => item.reasonLabel));
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

  test("deriveCuratedRelatedItems keeps byte-level tokenization links pointed at current shipped neighbors", () => {
    const items = deriveCuratedRelatedItems(
      byteLevelTokenization,
      [token, gpt3, gqa, byteLevelTokenization],
      publishedRegistryIds,
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.token",
      "model.gpt-3",
    ]);
    expect(items.every((item) => item.isPlanned)).toBe(false);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      "/docs/models/gpt-3",
    ]);
  });

  test("deriveSharedTagPeers collapses module-backed concept and module duplicates to one visible link", () => {
    const peers = deriveSharedTagPeers(
      gpt3,
      [learnedPositionalEmbeddingsModule, learnedPositionalEmbeddingsConcept],
      publishedRegistryIds,
    );

    expect(peers).toHaveLength(1);
    expect(peers[0]?.registryId).toBe("module.learned-positional-embeddings");
    expect(peers[0]?.href).toBe("/docs/modules/learned-positional-embeddings");
  });

  test("deriveDirectRelationshipPeers prioritizes explicit ontology links before generic siblings", () => {
    const source = getRegistryRecordById("module.standard-ffn");
    if (source?.kind !== "module") {
      throw new Error("expected module.standard-ffn to exist in the runtime");
    }

    const peers = deriveDirectRelationshipPeers(
      source,
      listRelatedRegistryRecords(),
      new Set([
        "module.standard-ffn",
        "module.feed-forward-network",
        "concept.activation",
        "module.relu",
      ]),
    );

    expect(peers[0]?.registryId).toBe("module.feed-forward-network");
    expect(peers[0]?.reasonLabel).toBe("Direct variant relationship");
    expect(peers[1]?.registryId).toBe("module.swiglu");
    expect(peers[1]?.reasonLabel).toBe("Variant of this page");
    expect(peers.map((item) => item.registryId)).toContain(
      "concept.activation",
    );
    expect(peers.map((item) => item.registryId)).toContain("module.relu");
  });

  test("deriveClassificationSiblingPeers labels same-branch peers with ontology classifications", () => {
    const source = getRegistryRecordById("module.grouped-query-attention");
    if (source?.kind !== "module") {
      throw new Error(
        "expected module.grouped-query-attention to exist in the runtime",
      );
    }

    const peers = deriveClassificationSiblingPeers(
      source,
      listRelatedRegistryRecords(),
      new Set([
        "module.grouped-query-attention",
        "module.multi-head-attention",
        "module.multi-query-attention",
      ]),
    );

    expect(peers.map((item) => item.registryId)).not.toContain(
      "module.multi-head-attention",
    );
    expect(peers.map((item) => item.registryId)).toContain(
      "module.multi-query-attention",
    );
    expect(
      peers.every((item) =>
        item.reasonLabel.startsWith(
          "Same classification: attention mechanisms",
        ),
      ),
    ).toBe(true);
  });

  test("deriveSharedParentClassificationPeers only falls back when exact classification siblings differ", () => {
    const source = getRegistryRecordById("module.grouped-query-attention");
    if (source?.kind !== "module") {
      throw new Error(
        "expected module.grouped-query-attention to exist in the runtime",
      );
    }

    const peers = deriveSharedParentClassificationPeers(
      source,
      listRelatedRegistryRecords(),
      new Set([
        "module.grouped-query-attention",
        "module.multi-head-attention",
        "module.feed-forward-network",
        "module.relu",
      ]),
    );

    expect(peers.map((item) => item.registryId)).toContain(
      "module.multi-head-attention",
    );
    expect(peers.map((item) => item.registryId)).toContain(
      "module.feed-forward-network",
    );
    expect(peers.map((item) => item.registryId)).toContain("module.relu");
    expect(
      peers.find((item) => item.registryId === "module.multi-head-attention")
        ?.reasonLabel,
    ).toBe("Shares parent classification: attention mechanisms");
    expect(
      peers.find((item) => item.registryId === "module.feed-forward-network")
        ?.reasonLabel,
    ).toBe("Shares parent classification: module");
  });

  test("excludeRelatedDocItems removes already-rendered peers without reordering the rest", () => {
    const source: ConceptRecord = {
      ...token,
      relatedIds: [
        "module.grouped-query-attention",
        "module.multi-head-attention",
        "module.multi-query-attention",
      ],
    };
    const items = deriveCuratedRelatedItems(
      source,
      [gqa, mha, mqa],
      publishedRegistryIds,
    );

    expect(
      excludeRelatedDocItems(items, [
        "module.multi-head-attention",
        "module.multi-query-attention",
      ]).map((item) => item.registryId),
    ).toEqual(["module.grouped-query-attention"]);
  });

  test("deriveRelatedDocGroups lets curated-related own overlaps with shared-tags", () => {
    const groups = deriveRelatedDocGroups(
      gpt3,
      [
        gpt3,
        mha,
        learnedPositionalEmbeddingsModule,
        learnedPositionalEmbeddingsConcept,
      ],
      [SHARED_TAGS, CURATED_RELATED],
      new Set([
        ...publishedRegistryIds,
        "model.gpt-3",
        "module.multi-head-attention",
        "module.learned-positional-embeddings",
        "concept.learned-positional-embeddings",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([CURATED_RELATED]);
    expect(groups[0]?.items.map((item) => item.registryId)).toEqual([
      "module.multi-head-attention",
      "module.learned-positional-embeddings",
    ]);
  });

  test("deriveRelatedDocGroups lets same-concept-type own overlaps with shared-tags", () => {
    const overlappingPeer: ConceptRecord = {
      ...token,
      id: "concept.architecture",
      slug: "architecture",
      aliases: ["Architecture"],
    };
    const tagOnlyPeer: ModuleRecord = {
      ...gqa,
      id: "module.attention",
      slug: "attention",
      aliases: ["Attention"],
      variantGroup: undefined,
    };

    const groups = deriveRelatedDocGroups(
      token,
      [token, overlappingPeer, tagOnlyPeer],
      [SHARED_TAGS, SAME_CONCEPT_TYPE],
      new Set([
        ...publishedRegistryIds,
        "concept.architecture",
        "module.attention",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      COMPATIBILITY_SAME_CONCEPT_TYPE,
      SHARED_TAGS,
    ]);
    expect(groups[0]?.items.map((item) => item.registryId)).toEqual([
      "concept.architecture",
    ]);
    expect(groups[1]?.items.map((item) => item.registryId)).toEqual([
      "module.attention",
    ]);
  });

  test("deriveRelatedDocGroups lets curated-related own overlaps with same-variant-group and renders it first", () => {
    const source: ModuleRecord = {
      ...gqa,
      relatedIds: [
        "module.multi-head-attention",
        "module.multi-query-attention",
        "module.attention",
      ],
    };
    const attention: ModuleRecord = {
      ...gqa,
      id: "module.attention",
      slug: "attention",
      aliases: ["Attention"],
      variantGroup: undefined,
    };

    const groups = deriveRelatedDocGroups(
      source,
      [source, mha, mqa, attention],
      [SAME_VARIANT_GROUP, CURATED_RELATED],
      new Set([
        ...publishedRegistryIds,
        "module.attention",
        "module.multi-head-attention",
        "module.multi-query-attention",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([CURATED_RELATED]);
    expect(groups[0]?.items.map((item) => item.registryId)).toEqual([
      "module.multi-head-attention",
      "module.multi-query-attention",
      "module.attention",
    ]);
  });

  test("deriveRelatedDocGroups renders curated-related before same-concept-type and shared-tags", () => {
    const source: ConceptRecord = {
      ...token,
      relatedIds: ["concept.transformer"],
    };
    const groups = deriveRelatedDocGroups(
      source,
      [source, draftTransformer, gqa],
      [SHARED_TAGS, SAME_CONCEPT_TYPE, CURATED_RELATED],
      new Set([...publishedRegistryIds, "concept.transformer"]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      CURATED_RELATED,
      SHARED_TAGS,
    ]);
    expect(groups[0]?.items.map((item) => item.registryId)).toEqual([
      "concept.transformer",
    ]);
    expect(groups[1]?.items.map((item) => item.registryId)).toEqual([
      "module.grouped-query-attention",
    ]);
  });

  test("deriveRelatedDocGroups omits empty groups and ignores unsupported ids", () => {
    const groups = deriveRelatedDocGroups(
      gqa,
      [gqa, mqa, mha],
      [SAME_VARIANT_GROUP, "used-by-models", CURATED_RELATED],
      publishedRegistryIds,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe(COMPATIBILITY_SAME_VARIANT_GROUP);
    expect(groups[0]?.items).toHaveLength(2);
  });

  test("deriveRelatedDocGroups keeps legacy variant-group requests on the explicit compatibility branch when ontology data is absent", () => {
    const groups = deriveRelatedDocGroups(
      gqa,
      [gqa, mqa, mha, sparse],
      [SAME_VARIANT_GROUP],
      publishedRegistryIds,
    );

    expect(groups.map((group) => group.id)).toEqual([
      COMPATIBILITY_SAME_VARIANT_GROUP,
    ]);
    expect(groups[0]?.items.map((item) => item.registryId)).toEqual([
      "module.multi-head-attention",
      "module.multi-query-attention",
    ]);
  });

  test("deriveRelatedDocGroups returns shared-tags for concept sources", () => {
    const groups = deriveRelatedDocGroups(
      token,
      [token, gqa, mqa, mha, draftTransformer],
      [SHARED_TAGS, SAME_CONCEPT_TYPE],
      publishedRegistryIds,
    );

    expect(groups.map((group) => group.id)).toEqual([
      COMPATIBILITY_SAME_CONCEPT_TYPE,
      SHARED_TAGS,
    ]);
    const plannedGroup = groups.find(
      (group) => group.id === COMPATIBILITY_SAME_CONCEPT_TYPE,
    );
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

  test("deriveRelatedDocGroups upgrades legacy module groups to ontology-derived peers when ancestry exists", () => {
    const source = getRegistryRecordById("module.grouped-query-attention");
    if (source?.kind !== "module") {
      throw new Error(
        "expected module.grouped-query-attention to exist in the runtime",
      );
    }

    const groups = deriveRelatedDocGroups(
      source,
      listRelatedRegistryRecords(),
      [SAME_VARIANT_GROUP, CURATED_RELATED],
      new Set([
        "module.grouped-query-attention",
        "module.multi-head-attention",
        "module.multi-query-attention",
        "module.attention",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      CURATED_RELATED,
      CLASSIFICATION_SIBLINGS,
      SHARED_PARENT_CLASSIFICATION,
    ]);
  });

  test("deriveRelatedDocGroups expands legacy module peer aliases into ontology groups before shared tags", () => {
    const source = getRegistryRecordById("module.grouped-query-attention");
    if (source?.kind !== "module") {
      throw new Error(
        "expected module.grouped-query-attention to exist in the runtime",
      );
    }

    const groups = deriveRelatedDocGroups(
      source,
      listRelatedRegistryRecords(),
      [SAME_VARIANT_GROUP, SHARED_TAGS],
      new Set([
        "module.grouped-query-attention",
        "module.multi-head-attention",
        "module.multi-query-attention",
        "module.feed-forward-network",
        "concept.token",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      CLASSIFICATION_SIBLINGS,
      SHARED_PARENT_CLASSIFICATION,
      SHARED_TAGS,
    ]);
    expect(groups[0]?.items.map((item) => item.registryId)).toContain(
      "module.multi-query-attention",
    );
    expect(groups[1]?.items.map((item) => item.registryId)).toContain(
      "module.multi-head-attention",
    );
    expect(groups[1]?.items.map((item) => item.registryId)).toContain(
      "module.feed-forward-network",
    );
    expect(groups[2]?.items.map((item) => item.registryId)).toContain(
      "concept.token",
    );
  });

  test("deriveRelatedDocGroups expands legacy same-concept-type requests into the full ontology-first branch for ontology-backed records", () => {
    const source = getRegistryRecordById("module.standard-ffn");
    if (source?.kind !== "module") {
      throw new Error("expected module.standard-ffn to exist in the runtime");
    }

    const groups = deriveRelatedDocGroups(
      source,
      listRelatedRegistryRecords(),
      [SAME_CONCEPT_TYPE],
      new Set([
        "module.standard-ffn",
        "module.feed-forward-network",
        "module.swiglu",
        "concept.activation",
        "module.relu",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      DIRECT_RELATIONSHIPS,
      CLASSIFICATION_SIBLINGS,
      SHARED_PARENT_CLASSIFICATION,
    ]);
    expect(groups[0]?.items.map((item) => item.registryId)).toContain(
      "module.feed-forward-network",
    );
    expect(groups[1]?.items.map((item) => item.registryId)).toEqual(
      expect.arrayContaining([
        "module.deepseekmoe",
        "module.mixture-of-experts",
      ]),
    );
    expect(groups[2]?.items.map((item) => item.registryId)).toContain(
      "module.grouped-query-attention",
    );
  });

  test("deriveRelatedDocGroups keeps explicit compatibility groups isolated even for ontology-backed records", () => {
    const source = getRegistryRecordById("module.grouped-query-attention");
    if (source?.kind !== "module") {
      throw new Error(
        "expected module.grouped-query-attention to exist in the runtime",
      );
    }

    const groups = deriveRelatedDocGroups(
      source,
      listRelatedRegistryRecords(),
      [COMPATIBILITY_SAME_VARIANT_GROUP],
      new Set([
        "module.grouped-query-attention",
        "module.multi-head-attention",
        "module.multi-query-attention",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      COMPATIBILITY_SAME_VARIANT_GROUP,
    ]);
    expect(groups[0]?.items.map((item) => item.registryId)).toEqual([
      "module.multi-head-attention",
      "module.multi-query-attention",
    ]);
  });

  test("deriveRelatedDocGroups only adds compatibility peer groups for ontology-backed records when they are explicitly requested", () => {
    const source = getRegistryRecordById("concept.transformer-architecture");
    if (source?.kind !== "concept") {
      throw new Error(
        "expected concept.transformer-architecture to exist in the runtime",
      );
    }

    const groups = deriveRelatedDocGroups(
      source,
      listRelatedRegistryRecords(),
      [SAME_CONCEPT_TYPE, COMPATIBILITY_SAME_CONCEPT_TYPE],
      new Set([
        "concept.transformer-architecture",
        "concept.tokenizers-overview",
        "concept.activation",
        "concept.embedding",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      CLASSIFICATION_SIBLINGS,
      SHARED_PARENT_CLASSIFICATION,
      COMPATIBILITY_SAME_CONCEPT_TYPE,
    ]);
    expect(groups[2]?.items.map((item) => item.registryId)).toEqual([
      "module.manifold-constrained-hyper-connections",
    ]);
    expect(groups[1]?.items.map((item) => item.registryId)).toEqual(
      expect.arrayContaining(["concept.embedding"]),
    );
  });

  test("deriveRelatedDocGroups keeps explicit ontology groups in policy order", () => {
    const source = getRegistryRecordById("module.standard-ffn");
    if (source?.kind !== "module") {
      throw new Error("expected module.standard-ffn to exist in the runtime");
    }

    const groups = deriveRelatedDocGroups(
      source,
      listRelatedRegistryRecords(),
      [
        SHARED_PARENT_CLASSIFICATION,
        DIRECT_RELATIONSHIPS,
        CLASSIFICATION_SIBLINGS,
      ],
      new Set([
        "module.standard-ffn",
        "module.feed-forward-network",
        "concept.activation",
        "module.relu",
        "module.swiglu",
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      DIRECT_RELATIONSHIPS,
      CLASSIFICATION_SIBLINGS,
      SHARED_PARENT_CLASSIFICATION,
    ]);
  });

  test("related-doc contract exposes ontology and compatibility group inventories separately", () => {
    expect(ONTOLOGY_RELATED_DOC_GROUP_IDS).toEqual([
      DIRECT_RELATIONSHIPS,
      CLASSIFICATION_SIBLINGS,
      SHARED_PARENT_CLASSIFICATION,
    ]);
    expect(COMPATIBILITY_RELATED_DOC_GROUP_IDS).toEqual([
      COMPATIBILITY_SAME_VARIANT_GROUP,
      COMPATIBILITY_SAME_CONCEPT_TYPE,
    ]);
  });
});
