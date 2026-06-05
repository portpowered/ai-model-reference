import { describe, expect, test } from "bun:test";
import groupedQueryAttentionComparison from "@/content/registry/tables/grouped-query-attention-comparison.json";
import {
  buildModuleComparisonTable,
  collectTableMessageKeys,
} from "@/lib/content/module-comparison-table";
import { getModuleById } from "@/lib/content/registry-runtime";
import { type PageMessages, tableRecordSchema } from "@/lib/content/schemas";

const tableRecord = tableRecordSchema.parse(groupedQueryAttentionComparison);

const messages = {
  title: "Grouped-Query Attention",
  description: "GQA module page",
  tables: {
    comparison: {
      columns: {
        gqa: { title: "Grouped-Query Attention" },
        mha: { title: "Multi-Head Attention" },
        mqa: { title: "Multi-Query Attention" },
      },
      dimensions: {
        kvHeadCount: "KV head count",
        queryHeadFlexibility: "Query-head flexibility",
        cacheFootprint: "Cache footprint per token",
      },
      values: {
        gqa: {
          kvHeadCount: "G key heads and G value heads",
          queryHeadFlexibility:
            "H distinct query heads grouped into G shared KV pairs",
          cacheFootprint: "2G tensors (G keys + G values)",
        },
        mha: {
          kvHeadCount: "H key heads and H value heads",
          queryHeadFlexibility: "H independent query/KV head pairs",
          cacheFootprint: "2H tensors (full multi-head attention cache)",
        },
        mqa: {
          kvHeadCount: "1 key head and 1 value head",
          queryHeadFlexibility: "H query heads share one KV pair",
          cacheFootprint: "2 tensors (single shared KV cache)",
        },
      },
    },
  },
} satisfies PageMessages;

describe("module-comparison-table", () => {
  test("builds GQA comparison rows for MHA and MQA columns", () => {
    const built = buildModuleComparisonTable(
      tableRecord,
      messages,
      getModuleById,
    );

    expect(built.columns.map((column) => column.moduleId)).toEqual([
      "module.grouped-query-attention",
      "module.multi-head-attention",
      "module.multi-query-attention",
    ]);
    expect(built.columns[1]?.href).toBe("/docs/modules/multi-head-attention");
    expect(built.columns[2]?.href).toBe("/docs/modules/multi-query-attention");
    expect(built.rows.map((row) => row.dimensionId)).toEqual([
      "kvHeadCount",
      "queryHeadFlexibility",
      "cacheFootprint",
    ]);
    expect(built.rows[0]?.cells[0]?.value).toContain("G key heads");
    expect(built.rows[1]?.cells[1]?.value).toContain("independent query");
    expect(built.rows[2]?.cells[2]?.value).toContain("single shared KV");
  });

  test("collects all table message keys for validation", () => {
    const keys = collectTableMessageKeys(tableRecord);
    expect(keys).toContain("tables.comparison.dimensions.kvHeadCount");
    expect(keys).toContain("tables.comparison.values.mha.cacheFootprint");
    expect(keys).toContain("tables.comparison.columns.gqa.title");
  });
});
