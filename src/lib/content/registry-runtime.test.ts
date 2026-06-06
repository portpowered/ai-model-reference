import { describe, expect, test } from "bun:test";
import {
  getConceptById,
  getModuleById,
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
    expect(record?.relatedIds).toContain("module.grouped-query-attention");
    expect(record?.relatedIds).toContain("concept.token");
  });

  test("getModuleById returns grouped-query attention", () => {
    const record = getModuleById("module.grouped-query-attention");
    expect(record?.slug).toBe("grouped-query-attention");
    expect(record?.tags).toEqual(["attention", "kv-cache"]);
  });

  test("getRegistryTags returns tags for a known module", () => {
    expect(getRegistryTags("module.grouped-query-attention")).toEqual([
      "attention",
      "kv-cache",
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
  });

  test("getConceptById returns published embedding and logit for chain", () => {
    const embedding = getConceptById("concept.embedding");
    expect(embedding?.slug).toBe("embedding");
    expect(embedding?.status).toBe("published");

    const logit = getConceptById("concept.logit");
    expect(logit?.status).toBe("published");
    expect(logit?.relatedIds).toContain("concept.softmax");
  });

  test("listModuleRecords includes attention overview and variant-group peers", () => {
    const ids = listModuleRecords().map((record) => record.id);
    expect(ids).toContain("module.attention");
    expect(ids).toContain("module.multi-query-attention");
    expect(ids).toContain("module.multi-head-attention");
  });
});
