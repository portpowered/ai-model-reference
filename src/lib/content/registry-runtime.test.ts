import { describe, expect, test } from "bun:test";
import {
  getConceptById,
  getDatasetById,
  getModuleById,
  getOrganizationById,
  getRegistryCitationIds,
  getRegistryRecordById,
  getRegistryTags,
  listConceptRecords,
  listModuleRecords,
  listRelatedRegistryRecords,
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
        "full-context attention",
        "full context attention",
      ]),
    );
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.grouped-query-attention",
      "concept.encoder",
      "concept.encoder-decoder",
      "concept.transformer",
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

  test("getRegistryCitationIds returns empty array for concept.token", () => {
    expect(getRegistryCitationIds("concept.token")).toEqual([]);
  });

  test("getRegistryCitationIds returns undefined for unknown records", () => {
    expect(getRegistryCitationIds("module.unknown")).toBeUndefined();
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

  test("listModuleRecords includes attention overview and variant-group peers", () => {
    const ids = listModuleRecords().map((record) => record.id);
    expect(ids).toContain("module.attention");
    expect(ids).toContain("module.bidirectional-attention");
    expect(ids).toContain("module.multi-query-attention");
    expect(ids).toContain("module.multi-head-attention");
  });
});
