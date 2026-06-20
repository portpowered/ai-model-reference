import { describe, expect, test } from "bun:test";
import {
  getConceptById,
  getDatasetById,
  getModuleById,
  getOrganizationById,
  getPaperById,
  getPrimaryClassificationForRecord,
  getRegistryCitationIds,
  getRegistryRecordById,
  getRegistryTags,
  getSystemById,
  listClassificationMembers,
  listConceptRecords,
  listModuleRecords,
  listOntologyRelationshipsForRecord,
  listRelatedRegistryRecords,
  listSecondaryClassificationsForRecord,
  listSystemRecords,
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
      getPrimaryClassificationForRecord("module.grouped-query-attention"),
    ).toBeUndefined();
    expect(
      listSecondaryClassificationsForRecord("module.grouped-query-attention"),
    ).toEqual([]);
    expect(
      listOntologyRelationshipsForRecord("module.grouped-query-attention"),
    ).toEqual([]);
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
      "system.expert-parallel-overlap",
      "system.on-disk-kv-cache",
      "paper.deepseek-v4",
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
});
