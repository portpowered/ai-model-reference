import { describe, expect, test } from "bun:test";
import {
  getTableById,
  listTableRecords,
} from "@/lib/content/table-registry-runtime";

describe("table-registry-runtime", () => {
  test("loads the GQA nearby-module comparison table by id", () => {
    const table = getTableById("table.grouped-query-attention-comparison");
    expect(table?.id).toBe("table.grouped-query-attention-comparison");
    expect(table?.columns.length).toBe(3);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.multi-head-attention"]?.kvHeadCount,
    ).toBe("tables.comparison.values.mha.kvHeadCount");
  });

  test("lists bundled table records", () => {
    expect(listTableRecords().length).toBe(1);
  });
});
