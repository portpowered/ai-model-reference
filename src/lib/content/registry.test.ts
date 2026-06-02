import { describe, expect, test } from "bun:test";
import { getModuleById } from "@/lib/content/registry";

describe("registry", () => {
  test("loads the grouped-query attention module record", () => {
    const record = getModuleById("module.grouped-query-attention");
    expect(record).toBeDefined();
    expect(record?.moduleType).toBe("attention");
    expect(record?.variantGroup).toBe("attention-head-sharing");
    expect(record?.optimizes).toContain("kv-cache");
  });
});
