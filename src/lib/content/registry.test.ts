import { describe, expect, test } from "bun:test";
import {
  getModuleById,
  getRegistryCitationIds,
  getRegistryTags,
  listModuleRecords,
} from "@/lib/content/registry";

describe("registry", () => {
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

  test("getRegistryTags returns undefined for unknown records", () => {
    expect(getRegistryTags("module.unknown")).toBeUndefined();
  });

  test("getRegistryCitationIds returns citations for grouped-query attention", () => {
    expect(getRegistryCitationIds("module.grouped-query-attention")).toEqual([
      "citation.gqa-paper",
    ]);
  });

  test("getRegistryCitationIds returns undefined for unknown records", () => {
    expect(getRegistryCitationIds("module.unknown")).toBeUndefined();
  });

  test("listModuleRecords includes variant-group peers for GQA", () => {
    const ids = listModuleRecords().map((record) => record.id);
    expect(ids).toContain("module.multi-query-attention");
    expect(ids).toContain("module.multi-head-attention");
  });
});
