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

  test("loads the MLA nearby-module comparison table by id", () => {
    const table = getTableById("table.multi-head-latent-attention-comparison");
    expect(table?.id).toBe("table.multi-head-latent-attention-comparison");
    expect(table?.columns.length).toBe(4);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.grouped-query-attention"]
        ?.cacheFootprint,
    ).toBe("tables.comparison.values.gqa.cacheFootprint");
  });

  test("loads the sliding-window-attention nearby-module comparison table by id", () => {
    const table = getTableById("table.sliding-window-attention-comparison");
    expect(table?.id).toBe("table.sliding-window-attention-comparison");
    expect(table?.columns.length).toBe(4);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.sliding-window-attention"]
        ?.attentionLocality,
    ).toBe("tables.comparison.values.window.attentionLocality");
  });

  test("loads the sparse-attention nearby-module comparison table by id", () => {
    const table = getTableById("table.sparse-attention-comparison");
    expect(table?.id).toBe("table.sparse-attention-comparison");
    expect(table?.columns.length).toBe(4);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.sparse-attention"]
        ?.attentionConnectivity,
    ).toBe("tables.comparison.values.sparse.attentionConnectivity");
  });

  test("lists bundled table records", () => {
    expect(listTableRecords().length).toBe(4);
  });
});
