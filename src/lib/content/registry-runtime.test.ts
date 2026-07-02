import { describe, expect, test } from "bun:test";
import {
  buildClassificationSubtree,
  buildClassificationTree,
  CLASSIFICATION_RUNTIME_EMPTY_BRANCH_RULE,
  CLASSIFICATION_RUNTIME_ORDERING_RULE,
  getCitationById,
  getClassificationBranchMembership,
  getClassificationById,
  getConceptById,
  getDatasetById,
  getModelById,
  getModuleById,
  getOrganizationById,
  getPaperById,
  getParentClassificationById,
  getPrimaryClassificationForRecord,
  getRegistryCitationIds,
  getRegistryRecordById,
  getRegistryTags,
  getSystemById,
  getTrainingRegimeById,
  listChildClassifications,
  listCitationRecords,
  listClassificationAncestors,
  listClassificationChildren,
  listClassificationDescendants,
  listClassificationMembers,
  listClassificationRecords,
  listClassificationRoots,
  listConceptRecords,
  listDatasetRecords,
  listLegacyClassificationBridges,
  listModelRecords,
  listModuleRecords,
  listOntologyRelationshipsForRecord,
  listOrganizationRecords,
  listPaperRecords,
  listRelatedRegistryRecords,
  listSecondaryClassificationsForRecord,
  listSystemRecords,
  listTrainingRegimeRecords,
} from "@/lib/content/registry-runtime";

describe("registry-runtime", () => {
  test("getModuleById returns attention bridge module", () => {
    const record = getModuleById("module.attention");
    expect(record?.slug).toBe("attention");
    expect(record?.tags).toEqual(["attention"]);
    expect(record?.aliases).toContain("self-attention");
    expect(record?.relatedIds).toContain("module.multi-head-attention");
    expect(record?.relatedIds).toContain("module.multi-query-attention");
    expect(record?.relatedIds).toContain("module.grouped-query-attention");
    expect(record?.relatedIds).toContain("concept.kv-cache");
    expect(record?.relatedIds).toContain("concept.token");
    expect(record?.relatedIds).toContain("concept.prefill-decode-split");
  });

  test("getModuleById returns grouped-query attention", () => {
    const record = getModuleById("module.grouped-query-attention");
    expect(record?.slug).toBe("grouped-query-attention");
    expect(record?.tags).toEqual(["attention", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.multi-query-attention",
      "concept.kv-cache",
      "concept.decode",
      "concept.quantization",
      "concept.prefill-decode-split",
    ]);
  });

  test("getModuleById returns causal attention with mask and generation neighbors", () => {
    const record = getModuleById("module.causal-attention");
    expect(record?.slug).toBe("causal-attention");
    expect(record?.tags).toEqual(["attention"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "causal attention",
        "causal self-attention",
        "causal mask",
        "look-ahead mask",
        "look ahead mask",
      ]),
    );
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.bidirectional-attention",
      "concept.autoregressive-generation",
      "concept.decoder",
      "concept.token",
      "concept.decode",
      "concept.prefill-decode-split",
    ]);
    expect(record?.variantGroup).toBe("attention-mask-patterns");
    expect(record?.moduleFamily).toBe("attention");
    expect(record?.moduleType).toBe("attention");
  });

  test("getModuleById returns published unigram tokenizer with tokenizer-family metadata", () => {
    const record = getModuleById("module.unigram-tokenizer");

    expect(record?.slug).toBe("unigram-tokenizer");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "unigram tokenizer",
        "unigram tokenization",
        "SentencePiece unigram",
      ]),
    );
    expect(record?.tags).toEqual([
      "tokenization",
      "foundations",
      "token-to-probability-chain",
    ]);
    expect(record?.moduleType).toBe("tokenizer");
    expect(record?.moduleFamily).toBe("tokenization");
    expect(record?.conceptType).toBe("tokenizer-variant");
    expect(record?.variantGroup).toBe("subword-tokenizers");
    expect(record?.sourceId).toBe("citation.kudo-sentencepiece");
    expect(record?.citationIds).toEqual([
      "citation.kudo-sentencepiece",
      "citation.sennrich-bpe",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.token",
      "concept.tokenizers-overview",
      "module.sentencepiece",
      "module.bpe",
    ]);
  });

  test("getModuleById returns bidirectional attention with encoder-side links", () => {
    const record = getModuleById("module.bidirectional-attention");
    expect(record?.slug).toBe("bidirectional-attention");
    expect(record?.tags).toEqual(["attention"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "bidirectional attention",
        "bidirectional self-attention",
        "bert attention",
        "full-context attention",
        "full context attention",
      ]),
    );
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "concept.autoregressive-generation",
      "concept.encoder",
      "concept.transformer-architecture",
      "concept.encoder-decoder",
    ]);
  });

  test("getModuleById returns sentencepiece as a tokenizer-family module", () => {
    const record = getModuleById("module.sentencepiece");
    expect(record?.slug).toBe("sentencepiece");
    expect(record?.moduleType).toBe("tokenizer");
    expect(record?.tags).toEqual([
      "tokenization",
      "foundations",
      "token-to-probability-chain",
    ]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "SentencePiece",
        "sentencepiece",
        "sentence piece",
        "multilingual tokenizer",
        "whitespace agnostic tokenizer",
      ]),
    );
    expect(record?.relatedIds).toEqual([
      "concept.tokenizers-overview",
      "concept.token",
      "module.bpe",
      "module.unigram-tokenizer",
      "module.wordpiece",
    ]);
    expect(record?.citationIds).toEqual(["citation.kudo-sentencepiece"]);
  });

  test("getModuleById returns cross-attention with nearby architecture links", () => {
    const record = getModuleById("module.cross-attention");
    expect(record?.slug).toBe("cross-attention");
    expect(record?.tags).toEqual(["attention"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "cross attention",
        "cross-attention",
        "encoder-decoder attention",
        "encoder decoder attention",
      ]),
    );
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.causal-attention",
      "module.bidirectional-attention",
      "concept.transformer-architecture",
      "concept.encoder-decoder",
      "concept.multimodal-model",
    ]);
    expect(record?.variantGroup).toBe("attention-memory-sources");
  });

  test("getRegistryTags returns tags for a known module", () => {
    expect(getRegistryTags("module.grouped-query-attention")).toEqual([
      "attention",
      "kv-cache",
    ]);
  });

  test("getRegistryTags returns tags for bidirectional attention", () => {
    expect(getRegistryTags("module.bidirectional-attention")).toEqual([
      "attention",
    ]);
  });

  test("getRegistryTags returns tokenization tags for sentencepiece", () => {
    expect(getRegistryTags("module.sentencepiece")).toEqual([
      "tokenization",
      "foundations",
      "token-to-probability-chain",
    ]);
  });

  test("getRegistryTags returns tags for causal attention", () => {
    expect(getRegistryTags("module.causal-attention")).toEqual(["attention"]);
  });

  test("getRegistryTags returns tags for cross-attention", () => {
    expect(getRegistryTags("module.cross-attention")).toEqual(["attention"]);
  });

  test("getRegistryTags returns tags for a known concept", () => {
    expect(getRegistryTags("concept.token")).toEqual([
      "attention",
      "token-to-probability-chain",
      "foundations",
    ]);
  });

  test("getConceptById returns token concept", () => {
    const record = getConceptById("concept.token");
    expect(record?.slug).toBe("token");
    expect(record?.tags).toEqual([
      "attention",
      "token-to-probability-chain",
      "foundations",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.byte-level-tokenization",
      "concept.special-tokens",
      "concept.tokenizers-overview",
      "concept.embedding",
      "concept.vocabulary-size",
      "concept.logit",
      "concept.softmax",
    ]);
  });

  test("getRegistryTags returns undefined for unknown records", () => {
    expect(getRegistryTags("module.unknown")).toBeUndefined();
  });

  test("getRegistryCitationIds returns citations for grouped-query attention", () => {
    expect(getRegistryCitationIds("module.grouped-query-attention")).toEqual([
      "citation.gqa-paper",
    ]);
  });

  test("getRegistryCitationIds returns citations for MHA and MQA modules", () => {
    expect(getRegistryCitationIds("module.multi-head-attention")).toEqual([
      "citation.attention-is-all-you-need",
    ]);
    expect(getRegistryCitationIds("module.multi-query-attention")).toEqual([
      "citation.shazeer-mqa-paper",
    ]);
  });

  test("getRegistryCitationIds returns citations for causal attention", () => {
    expect(getRegistryCitationIds("module.causal-attention")).toEqual([
      "citation.attention-is-all-you-need",
    ]);
  });

  test("getRegistryCitationIds returns citations for cross-attention", () => {
    expect(getRegistryCitationIds("module.cross-attention")).toEqual([
      "citation.attention-is-all-you-need",
    ]);
  });

  test("MHA and MQA modules link attention overview and sibling variants", () => {
    expect(getModuleById("module.multi-head-attention")?.relatedIds).toEqual([
      "module.attention",
      "module.multi-query-attention",
      "module.grouped-query-attention",
    ]);
    expect(getModuleById("module.multi-query-attention")?.relatedIds).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.grouped-query-attention",
      "concept.kv-cache",
      "concept.decode",
      "concept.quantization",
      "concept.prefill-decode-split",
    ]);
  });

  test("getRegistryCitationIds returns citations for concept.token", () => {
    expect(getRegistryCitationIds("concept.token")).toEqual([
      "citation.gpt-2-report",
      "citation.sennrich-bpe",
    ]);
  });

  test("getRegistryCitationIds returns undefined for unknown records", () => {
    expect(getRegistryCitationIds("module.unknown")).toBeUndefined();
  });

  test("ontology helpers return stable empty results for records without ontology data", () => {
    expect(
      getPrimaryClassificationForRecord("citation.sennrich-bpe"),
    ).toBeUndefined();
    expect(
      listSecondaryClassificationsForRecord("citation.sennrich-bpe"),
    ).toEqual([]);
    expect(listOntologyRelationshipsForRecord("citation.sennrich-bpe")).toEqual(
      [],
    );
  });

  test("ontology helpers return stable empty results for unknown records and classifications", () => {
    expect(
      getPrimaryClassificationForRecord("module.missing-runtime-record"),
    ).toBeUndefined();
    expect(
      listSecondaryClassificationsForRecord("module.missing-runtime-record"),
    ).toEqual([]);
    expect(
      listOntologyRelationshipsForRecord("module.missing-runtime-record"),
    ).toEqual([]);
    expect(
      listClassificationMembers("classification.missing-runtime-record"),
    ).toEqual([]);
  });

  test("activation and feed-forward classification seed records are published", () => {
    expect(
      getClassificationById("classification.module.activation")?.kind,
    ).toBe("classification");
    expect(
      getClassificationById("classification.activation-functions")?.id,
    ).toBe("classification.module.activation");
    expect(
      getClassificationById("classification.module.feed-forward")
        ?.parentClassificationId,
    ).toBe("classification.module");

    expect(listClassificationRecords().map((record) => record.id)).toEqual(
      expect.arrayContaining([
        "classification.module",
        "classification.module.activation",
        "classification.module.attention",
        "classification.module.feed-forward",
        "classification.module.normalization",
        "classification.module.positional-encoding",
        "classification.module.tokenization",
        "classification.module.transformer-block",
        "classification.module.attention.grouped-query",
        "classification.module.attention.multi-head",
        "classification.concept",
        "classification.concept.architecture",
        "classification.concept.architecture.activation",
        "classification.training",
        "classification.training.alignment",
        "classification.training.pretraining",
        "classification.system",
        "classification.system.routing",
      ]),
    );
  });

  test("classification helpers expose explicit parent and child hierarchy edges", () => {
    expect(
      getParentClassificationById("classification.module.attention")?.id,
    ).toBe("classification.module");
    expect(
      getParentClassificationById("classification.module"),
    ).toBeUndefined();
    expect(
      getParentClassificationById("classification.attention-mechanisms")?.id,
    ).toBe("classification.module");

    expect(
      listChildClassifications("classification.module").map(
        (classification) => classification.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "classification.module.activation",
        "classification.module.attention",
        "classification.module.feed-forward",
        "classification.module.normalization",
        "classification.module.positional-encoding",
        "classification.module.tokenization",
        "classification.module.transformer-block",
      ]),
    );
    expect(
      listChildClassifications("classification.attention-mechanisms").map(
        (classification) => classification.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "classification.module.attention.grouped-query",
        "classification.module.attention.multi-head",
      ]),
    );
    expect(
      listChildClassifications("classification.training").map(
        (classification) => classification.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "classification.training.alignment",
        "classification.training.pretraining",
      ]),
    );
    expect(
      listChildClassifications("classification.missing-runtime-record"),
    ).toEqual([]);
  });

  test("classification traversal helpers expose stable roots, children, ancestors, and descendants", () => {
    expect(CLASSIFICATION_RUNTIME_ORDERING_RULE.classifications).toBe(
      "sortOrder asc, slug asc, id asc",
    );
    expect(CLASSIFICATION_RUNTIME_ORDERING_RULE.members).toBe(
      "record.sortOrder asc, record.kind asc, record.slug asc, record.id asc, membershipType asc, classification sortOrder/slug/id",
    );
    expect(CLASSIFICATION_RUNTIME_ORDERING_RULE.nodeChildren).toBe(
      "classification children first, then record children",
    );

    expect(
      listClassificationRoots().map((classification) => classification.id),
    ).toEqual([
      "classification.concept",
      "classification.module",
      "classification.system",
      "classification.training",
    ]);

    expect(
      listClassificationRoots({
        classifiesKinds: ["module"],
      }).map((classification) => classification.id),
    ).toEqual(["classification.module"]);

    expect(
      listClassificationChildren("classification.module").map(
        (classification) => classification.id,
      ),
    ).toEqual([
      "classification.module.activation",
      "classification.module.attention",
      "classification.module.feed-forward",
      "classification.module.normalization",
      "classification.module.positional-encoding",
      "classification.module.tokenization",
      "classification.module.transformer-block",
    ]);
    expect(
      listClassificationChildren("classification.attention-mechanisms").map(
        (classification) => classification.id,
      ),
    ).toEqual([
      "classification.module.attention.grouped-query",
      "classification.module.attention.multi-head",
    ]);

    expect(
      listClassificationAncestors("classification.activation-functions").map(
        (classification) => classification.id,
      ),
    ).toEqual(["classification.module"]);
    expect(
      listClassificationAncestors(
        "classification.module.attention.grouped-query",
      ).map((classification) => classification.id),
    ).toEqual(["classification.module.attention", "classification.module"]);
    expect(
      listClassificationRoots({
        classifiesKinds: ["module"],
        statuses: ["draft"],
      }),
    ).toEqual([]);
    expect(
      listClassificationChildren("classification.missing-runtime-record"),
    ).toEqual([]);
    expect(
      listClassificationAncestors("classification.missing-runtime-record"),
    ).toEqual([]);
    expect(
      listClassificationDescendants("classification.activation-functions"),
    ).toEqual([]);
    expect(
      listClassificationDescendants("classification.attention-mechanisms").map(
        (classification) => classification.id,
      ),
    ).toEqual([
      "classification.module.attention.grouped-query",
      "classification.module.attention.multi-head",
    ]);
    const repeatedChildIds = listClassificationChildren(
      "classification.module",
    ).map((classification) => classification.id);
    expect(repeatedChildIds).toEqual(
      listClassificationChildren("classification.module").map(
        (classification) => classification.id,
      ),
    );

    const repeatedMemberIds = listClassificationMembers(
      "classification.attention-mechanisms",
      {
        includeDescendants: true,
      },
    ).map(
      (member) =>
        `${member.record.id}:${member.membershipType}:${member.classificationId}:${member.isInherited}`,
    );
    expect(repeatedMemberIds).toEqual(
      listClassificationMembers("classification.attention-mechanisms", {
        includeDescendants: true,
      }).map(
        (member) =>
          `${member.record.id}:${member.membershipType}:${member.classificationId}:${member.isInherited}`,
      ),
    );
  });

  test("classification tree runtime builds renderable nodes and hides empty branches by default", () => {
    const tree = buildClassificationTree({
      rootClassificationIds: ["classification.module"],
      memberKinds: ["module"],
    });

    expect(
      tree.map((node) => ({
        id: node.classification.id,
        directMemberCount: node.directMemberCount,
        totalMemberCount: node.totalMemberCount,
        childClassificationIds: node.classificationChildren.map(
          (child) => child.classification.id,
        ),
        childRecordIds: node.recordChildren.map(
          (child) => child.member.record.id,
        ),
      })),
    ).toEqual([
      {
        id: "classification.module",
        directMemberCount: 1,
        totalMemberCount: expect.any(Number),
        childClassificationIds: [
          "classification.module.activation",
          "classification.module.attention",
          "classification.module.feed-forward",
          "classification.module.normalization",
          "classification.module.positional-encoding",
          "classification.module.tokenization",
          "classification.module.transformer-block",
        ],
        childRecordIds: ["module.multi-token-prediction"],
      },
    ]);

    const activationBranch = tree[0]?.classificationChildren.find(
      (child) => child.classification.id === "classification.module.activation",
    );
    expect(activationBranch?.children[0]?.nodeType).toBe("record");
    expect(
      activationBranch?.recordChildren.map((child) => child.member.record.id),
    ).toEqual(
      expect.arrayContaining([
        "module.leaky-relu",
        "module.relu",
        "module.silu",
        "module.sigmoid",
      ]),
    );
    expect(
      buildClassificationTree({
        rootClassificationIds: ["classification.activation-functions"],
        memberKinds: ["paper"],
      }),
    ).toEqual([]);
    expect(
      buildClassificationTree({
        rootClassificationIds: ["classification.activation-functions"],
        memberKinds: ["paper"],
        includeEmptyClassifications: true,
      }).map((node) => ({
        id: node.classification.id,
        totalMemberCount: node.totalMemberCount,
      })),
    ).toEqual([
      {
        id: "classification.module.activation",
        totalMemberCount: 0,
      },
    ]);
  });

  test("classification subtree runtime exposes stable filters, owning-branch record placement, and empty results", () => {
    const subtree = buildClassificationSubtree({
      rootClassificationIds: ["classification.attention-mechanisms"],
      memberKinds: ["module"],
    });

    expect(subtree).toMatchObject({
      emptyBehavior: CLASSIFICATION_RUNTIME_EMPTY_BRANCH_RULE.defaultBehavior,
      isEmpty: false,
      memberPlacement:
        CLASSIFICATION_RUNTIME_EMPTY_BRANCH_RULE.subtreeMemberPlacement,
      filters: {
        memberKinds: ["module"],
        memberPlacement:
          CLASSIFICATION_RUNTIME_EMPTY_BRANCH_RULE.subtreeMemberPlacement,
        rootClassificationIds: ["classification.module.attention"],
        statuses: ["published"],
        includeSecondary: false,
      },
    });
    expect(subtree.roots).toHaveLength(1);
    expect(
      subtree.roots[0]?.recordChildren.map((child) => child.member.record.id),
    ).toEqual(
      expect.arrayContaining([
        "module.attention",
        "module.bidirectional-attention",
        "module.causal-attention",
        "module.multi-query-attention",
      ]),
    );
    expect(
      subtree.roots[0]?.recordChildren.some(
        (child) => child.member.record.id === "module.grouped-query-attention",
      ),
    ).toBe(false);

    const groupedQueryBranch = subtree.roots[0]?.classificationChildren.find(
      (child) =>
        child.classification.id ===
        "classification.module.attention.grouped-query",
    );
    expect(
      groupedQueryBranch?.recordChildren.map((child) => child.member.record.id),
    ).toEqual(["module.grouped-query-attention"]);

    expect(
      buildClassificationSubtree({
        rootClassificationIds: ["classification.activation-functions"],
        memberKinds: ["paper"],
      }),
    ).toMatchObject({
      emptyBehavior: CLASSIFICATION_RUNTIME_EMPTY_BRANCH_RULE.defaultBehavior,
      isEmpty: true,
      roots: [],
      memberPlacement:
        CLASSIFICATION_RUNTIME_EMPTY_BRANCH_RULE.subtreeMemberPlacement,
      filters: {
        rootClassificationIds: ["classification.module.activation"],
      },
    });
  });

  test("classification branch membership keeps descendants separate from direct owners", () => {
    const branchMembership = getClassificationBranchMembership(
      "classification.attention-mechanisms",
      {
        memberKinds: ["module"],
      },
    );

    expect(branchMembership).toMatchObject({
      classification: {
        id: "classification.module.attention",
      },
      directMemberCount: expect.any(Number),
      descendantMemberCount: 2,
      memberPlacement: "owning-classification",
      totalMemberCount: expect.any(Number),
    });
    expect(
      branchMembership?.directMembers.map((member) => member.record.id),
    ).toEqual(
      expect.arrayContaining([
        "module.attention",
        "module.bidirectional-attention",
        "module.causal-attention",
        "module.multi-query-attention",
      ]),
    );
    expect(
      branchMembership?.directMembers.some(
        (member) => member.record.id === "module.grouped-query-attention",
      ),
    ).toBe(false);
    expect(
      branchMembership?.descendantMembers.map(
        (member) =>
          `${member.classificationId}:${member.isInherited}:${member.record.id}`,
      ),
    ).toEqual([
      "classification.module.attention.grouped-query:true:module.grouped-query-attention",
      "classification.module.attention.multi-head:true:module.multi-head-attention",
    ]);
    expect(
      getClassificationBranchMembership(
        "classification.missing-runtime-record",
      ),
    ).toBeUndefined();
  });

  test("legacy classification bridge remains explicit and measurable", () => {
    expect(listLegacyClassificationBridges()).toEqual(
      expect.arrayContaining([
        {
          legacyId: "classification.attention-mechanisms",
          canonicalId: "classification.module.attention",
        },
        {
          legacyId: "classification.activation-functions",
          canonicalId: "classification.module.activation",
        },
      ]),
    );
  });

  test("seeded activation records resolve through ontology classification helpers", () => {
    expect(getPrimaryClassificationForRecord("concept.activation")?.id).toBe(
      "classification.concept.architecture.activation",
    );
    expect(getPrimaryClassificationForRecord("module.sigmoid")?.id).toBe(
      "classification.module.activation",
    );
    expect(listSecondaryClassificationsForRecord("module.sigmoid")).toEqual([]);
    expect(getPrimaryClassificationForRecord("module.relu")?.id).toBe(
      "classification.module.activation",
    );
    expect(getPrimaryClassificationForRecord("module.leaky-relu")?.id).toBe(
      "classification.module.activation",
    );
    expect(getPrimaryClassificationForRecord("module.silu")?.id).toBe(
      "classification.module.activation",
    );

    expect(
      listClassificationMembers("classification.activation-functions").map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:classification.module.activation:module.sigmoid",
        "primary:classification.module.activation:module.relu",
        "primary:classification.module.activation:module.leaky-relu",
        "primary:classification.module.activation:module.silu",
      ]),
    );
  });

  test("seeded feed-forward records resolve through ontology classification helpers", () => {
    expect(
      getPrimaryClassificationForRecord("module.feed-forward-network")?.id,
    ).toBe("classification.module.feed-forward");
    expect(
      listSecondaryClassificationsForRecord("module.feed-forward-network"),
    ).toEqual([]);
    for (const registryId of [
      "module.standard-ffn",
      "module.swiglu",
      "module.mixture-of-experts",
      "module.deepseekmoe",
    ]) {
      expect(getPrimaryClassificationForRecord(registryId)?.id).toBe(
        "classification.module.feed-forward",
      );
      expect(listSecondaryClassificationsForRecord(registryId)).toEqual([]);
    }

    expect(
      listClassificationMembers("classification.module.feed-forward").map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:classification.module.feed-forward:module.feed-forward-network",
        "primary:classification.module.feed-forward:module.standard-ffn",
        "primary:classification.module.feed-forward:module.swiglu",
        "primary:classification.module.feed-forward:module.mixture-of-experts",
        "primary:classification.module.feed-forward:module.deepseekmoe",
      ]),
    );
  });

  test("new module-family classifications cover supported attention, normalization, position, tokenization, and structural modules", () => {
    expect(getPrimaryClassificationForRecord("module.attention")?.id).toBe(
      "classification.module.attention",
    );
    expect(getPrimaryClassificationForRecord("module.layer-norm")?.id).toBe(
      "classification.module.normalization",
    );
    expect(getPrimaryClassificationForRecord("module.rope")?.id).toBe(
      "classification.module.positional-encoding",
    );
    expect(getPrimaryClassificationForRecord("module.bpe")?.id).toBe(
      "classification.module.tokenization",
    );
    expect(
      getPrimaryClassificationForRecord(
        "module.manifold-constrained-hyper-connections",
      )?.id,
    ).toBe("classification.module.transformer-block");
    expect(
      getPrimaryClassificationForRecord("module.multi-head-attention")?.id,
    ).toBe("classification.module.attention.multi-head");
    expect(
      getPrimaryClassificationForRecord("module.grouped-query-attention")?.id,
    ).toBe("classification.module.attention.grouped-query");

    expect(
      listClassificationMembers("classification.module.attention").map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:classification.module.attention:module.attention",
        "primary:classification.module.attention:module.causal-attention",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.attention", {
        includeSecondary: true,
      }).map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "secondary:classification.module.attention:module.multi-head-attention",
        "secondary:classification.module.attention:module.grouped-query-attention",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.attention", {
        includeDescendants: true,
      }).map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}:${member.isInherited}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:classification.module.attention.multi-head:module.multi-head-attention:true",
        "primary:classification.module.attention.grouped-query:module.grouped-query-attention:true",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.normalization").map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:classification.module.normalization:module.layer-norm",
        "primary:classification.module.normalization:module.rmsnorm",
      ]),
    );
    expect(
      listClassificationMembers(
        "classification.module.positional-encoding",
      ).map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:classification.module.positional-encoding:module.rope",
        "primary:classification.module.positional-encoding:module.alibi",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.tokenization").map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:classification.module.tokenization:module.bpe",
        "primary:classification.module.tokenization:module.wordpiece",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.transformer-block").map(
        (member) =>
          `${member.membershipType}:${member.classificationId}:${member.record.id}`,
      ),
    ).toEqual([
      "primary:classification.module.transformer-block:module.manifold-constrained-hyper-connections",
    ]);
  });

  test("seeded ontology relationships resolve typed activation and feed-forward topology", () => {
    expect(
      listOntologyRelationshipsForRecord("module.standard-ffn", "uses").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["concept.activation"]);
    expect(
      listOntologyRelationshipsForRecord("module.sigmoid", "used-by").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["module.standard-ffn"]);
    expect(
      listOntologyRelationshipsForRecord("module.swiglu", "uses").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["module.silu"]);
    expect(
      listOntologyRelationshipsForRecord("module.swiglu", "variant").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["module.standard-ffn"]);
    expect(
      listOntologyRelationshipsForRecord("module.feed-forward-network").map(
        (relationship) => relationship.targetId,
      ),
    ).toEqual(["classification.module", "concept.activation"]);
  });

  test("seeded ontology fields preserve existing tags and curated related ids", () => {
    expect(getConceptById("concept.activation")?.tags).toEqual([
      "token-to-probability-chain",
      "foundations",
    ]);
    expect(getModuleById("module.relu")?.relatedIds).toEqual([
      "concept.activation",
      "module.feed-forward-network",
      "module.standard-ffn",
      "module.leaky-relu",
      "module.silu",
    ]);
    expect(getModuleById("module.sigmoid")?.relatedIds).toEqual([
      "concept.activation",
      "module.feed-forward-network",
      "module.standard-ffn",
      "module.relu",
      "module.silu",
    ]);
    expect(getModuleById("module.swiglu")?.tags).toEqual([
      "feed-forward",
      "foundations",
    ]);
  });

  test("missing runtime lookups stay scoped to undefined without affecting known records", () => {
    expect(getModuleById("module.missing-runtime-record")).toBeUndefined();
    expect(getConceptById("concept.missing-runtime-record")).toBeUndefined();
    expect(
      getRegistryRecordById("module.missing-runtime-record"),
    ).toBeUndefined();
    expect(getRegistryTags("module.missing-runtime-record")).toBeUndefined();
    expect(
      getRegistryCitationIds("module.missing-runtime-record"),
    ).toBeUndefined();

    expect(getModuleById("module.attention")?.slug).toBe("attention");
  });

  test("getRegistryRecordById resolves modules and concepts", () => {
    expect(getRegistryRecordById("concept.token")?.kind).toBe("concept");
    expect(getRegistryRecordById("module.grouped-query-attention")?.kind).toBe(
      "module",
    );
  });

  test("dataset and organization entity types resolve through the runtime", () => {
    const dataset = getDatasetById("dataset.deepseek-v4-specialist-corpus");
    const organization = getOrganizationById("organization.deepseek-ai");

    expect(dataset?.kind).toBe("dataset");
    expect(dataset?.relatedIds).toContain("paper.deepseek-v4");
    expect(organization?.kind).toBe("organization");
    expect(organization?.aliases).toContain("DeepSeek AI");
    expect(
      getRegistryRecordById("dataset.deepseek-v4-specialist-corpus")?.kind,
    ).toBe("dataset");
    expect(getRegistryRecordById("organization.deepseek-ai")?.kind).toBe(
      "organization",
    );
    expect(
      listClassificationMembers("classification.deepseek-runtime-missing"),
    ).toEqual([]);
  });

  test("representative runtime helpers resolve every generated registry kind", () => {
    expect(getModuleById("module.grouped-query-attention")?.kind).toBe(
      "module",
    );
    expect(getConceptById("concept.kv-cache")?.kind).toBe("concept");
    expect(getModelById("model.gpt-3")?.kind).toBe("model");
    expect(getPaperById("paper.deepseek-v4")?.kind).toBe("paper");
    expect(getTrainingRegimeById("training-regime.dpo")?.kind).toBe(
      "training-regime",
    );
    expect(getSystemById("system.routing")?.kind).toBe("system");
    expect(getDatasetById("dataset.deepseek-v4-specialist-corpus")?.kind).toBe(
      "dataset",
    );
    expect(getOrganizationById("organization.deepseek-ai")?.kind).toBe(
      "organization",
    );
    expect(
      getClassificationById("classification.activation-functions")?.kind,
    ).toBe("classification");
    expect(getCitationById("citation.gqa-paper")?.kind).toBe("citation");

    expect(listModuleRecords().map((record) => record.id)).toContain(
      "module.grouped-query-attention",
    );
    expect(listConceptRecords().map((record) => record.id)).toContain(
      "concept.kv-cache",
    );
    expect(listModelRecords().map((record) => record.id)).toContain(
      "model.gpt-3",
    );
    expect(listPaperRecords().map((record) => record.id)).toContain(
      "paper.deepseek-v4",
    );
    expect(listTrainingRegimeRecords().map((record) => record.id)).toContain(
      "training-regime.dpo",
    );
    expect(listSystemRecords().map((record) => record.id)).toContain(
      "system.routing",
    );
    expect(listDatasetRecords().map((record) => record.id)).toContain(
      "dataset.deepseek-v4-specialist-corpus",
    );
    expect(listOrganizationRecords().map((record) => record.id)).toContain(
      "organization.deepseek-ai",
    );
    expect(listClassificationRecords().map((record) => record.id)).toContain(
      "classification.module.activation",
    );
    expect(listCitationRecords().map((record) => record.id)).toContain(
      "citation.gqa-paper",
    );
  });

  test("getSystemById returns the canonical routing system with serving aliases and nearby docs", () => {
    const record = getSystemById("system.routing");

    expect(record?.slug).toBe("routing");
    expect(record?.status).toBe("published");
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "Routing",
        "request routing",
        "inference routing",
        "serving router",
        "serve request to specialist model",
      ]),
    );
    expect(record?.relatedIds).toEqual([
      "training-regime.specialist-training",
      "module.mixture-of-experts",
      "module.deepseekmoe",
      "system.batching",
      "system.expert-parallel-overlap",
      "system.on-disk-kv-cache",
      "paper.deepseek-v4",
      "paper.nemotron-3-super",
      "model.mixtral-8x22b",
      "model.mixtral-8x7b",
      "model.nemotron-3-super",
    ]);
    expect(record?.relatedModuleIds).toEqual([
      "module.mixture-of-experts",
      "module.deepseekmoe",
    ]);
    expect(record?.organizationId).toBe("organization.deepseek-ai");
  });

  test("routing system is reachable from paper, organization, and the system registry list", () => {
    expect(getPaperById("paper.deepseek-v4")?.introducesIds).toContain(
      "system.routing",
    );
    expect(
      getOrganizationById("organization.deepseek-ai")?.systemIds,
    ).toContain("system.routing");
    expect(listSystemRecords().map((record) => record.id)).toContain(
      "system.routing",
    );
  });

  test("nearby published MoE and training records link back to routing for reciprocal discovery", () => {
    expect(getModuleById("module.mixture-of-experts")?.relatedIds).toContain(
      "system.routing",
    );
    expect(getModuleById("module.deepseekmoe")?.relatedIds).toContain(
      "system.routing",
    );
    expect(
      getRegistryRecordById("training-regime.specialist-training")?.relatedIds,
    ).toContain("system.routing");
  });

  test("getSystemById returns batching as the canonical serving system record", () => {
    const record = getSystemById("system.batching");

    expect(record?.slug).toBe("batching");
    expect(record?.systemType).toBe("serving");
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "request batching",
        "inference batching",
        "throughput latency tradeoff",
      ]),
    );
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.kv-cache",
      "system.continuous-batching",
      "system.speculative-decoding",
      "system.routing",
      "system.inference-engine",
      "system.on-disk-kv-cache",
      "system.expert-parallel-overlap",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.kv-cache",
    ]);
  });

  test("routing and inference engine keep reciprocal registry-backed links to batching", () => {
    expect(getSystemById("system.routing")?.relatedIds).toContain(
      "system.batching",
    );
    expect(getSystemById("system.inference-engine")?.relatedIds).toContain(
      "system.batching",
    );
  });

  test("listRelatedRegistryRecords includes concepts and modules", () => {
    const kinds = listRelatedRegistryRecords().map((record) => record.kind);
    expect(kinds).toContain("concept");
    expect(kinds).toContain("module");
  });

  test("listConceptRecords includes token and chain forward targets", () => {
    const ids = listConceptRecords().map((record) => record.id);
    expect(ids).toContain("concept.token");
    expect(ids).toContain("concept.embedding");
    expect(ids).toContain("concept.softmax");
    expect(ids).toContain("concept.prefill");
    expect(ids).toContain("concept.prefill-decode-split");
  });

  test("getConceptById returns published embedding and logit for chain", () => {
    const embedding = getConceptById("concept.embedding");
    expect(embedding?.slug).toBe("embedding");
    expect(embedding?.status).toBe("published");

    const logit = getConceptById("concept.logit");
    expect(logit?.status).toBe("published");
    expect(logit?.relatedIds).toContain("concept.softmax");
  });

  test("getConceptById returns vector glossary bridge concept", () => {
    const record = getConceptById("concept.vector");
    expect(record?.slug).toBe("vector");
    expect(record?.aliases).toEqual(
      expect.arrayContaining(["vector", "vectors", "dense vector"]),
    );
    expect(record?.tags).toEqual(
      expect.arrayContaining(["token-to-probability-chain", "foundations"]),
    );
    expect(record?.relatedIds).toContain("concept.embedding");
    expect(record?.relatedIds).toContain("concept.tensor");
  });

  test("getConceptById returns hidden size glossary bridge concept", () => {
    const record = getConceptById("concept.hidden-size");
    expect(record?.slug).toBe("hidden-size");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "hidden size",
        "model width",
        "hidden dimension",
      ]),
    );
    expect(record?.tags).toEqual(
      expect.arrayContaining(["token-to-probability-chain", "foundations"]),
    );
    expect(record?.relatedIds).toContain("concept.embedding");
    expect(record?.relatedIds).toContain("concept.tensor");
  });

  test("getConceptById returns vocabulary size as a glossary quantity", () => {
    const record = getConceptById("concept.vocabulary-size");
    expect(record?.slug).toBe("vocabulary-size");
    expect(record?.conceptType).toBe("math");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "vocabulary size",
        "vocab size",
        "tokenizer vocabulary",
        "token vocabulary size",
      ]),
    );
    expect(record?.tags).toEqual(
      expect.arrayContaining(["token-to-probability-chain", "foundations"]),
    );
    expect(record?.sidebarGrouping?.glossary).toBe("sequence-and-attention");
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.token",
        "concept.embedding",
        "concept.hidden-size",
        "concept.logit",
        "model.gpt-3",
      ]),
    );
    expect(record?.prerequisiteIds).toEqual([
      "concept.token",
      "concept.embedding",
    ]);
  });

  test("listModuleRecords includes attention overview and variant-group peers", () => {
    const ids = listModuleRecords().map((record) => record.id);
    expect(ids).toContain("module.attention");
    expect(ids).toContain("module.bidirectional-attention");
    expect(ids).toContain("module.multi-query-attention");
    expect(ids).toContain("module.multi-head-attention");
  });

  test("listSystemRecords includes batching and adjacent system peers", () => {
    const ids = listSystemRecords().map((record) => record.id);

    expect(ids).toContain("system.batching");
    expect(ids).toContain("system.on-disk-kv-cache");
    expect(ids).toContain("system.expert-parallel-overlap");
  });
});
