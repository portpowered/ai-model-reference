import groupedQueryAttentionComparison from "@/content/registry/tables/grouped-query-attention-comparison.json";
import linearAttentionComparison from "@/content/registry/tables/linear-attention-comparison.json";
import multiHeadAttentionComparison from "@/content/registry/tables/multi-head-attention-comparison.json";
import multiHeadLatentAttentionComparison from "@/content/registry/tables/multi-head-latent-attention-comparison.json";
import multiQueryAttentionComparison from "@/content/registry/tables/multi-query-attention-comparison.json";
import slidingWindowAttentionComparison from "@/content/registry/tables/sliding-window-attention-comparison.json";
import sparseAttentionComparison from "@/content/registry/tables/sparse-attention-comparison.json";
import { type TableRecord, tableRecordSchema } from "@/lib/content/schemas";

const tableRecords: TableRecord[] = [
  tableRecordSchema.parse(groupedQueryAttentionComparison),
  tableRecordSchema.parse(multiHeadAttentionComparison),
  tableRecordSchema.parse(linearAttentionComparison),
  tableRecordSchema.parse(multiHeadLatentAttentionComparison),
  tableRecordSchema.parse(multiQueryAttentionComparison),
  tableRecordSchema.parse(slidingWindowAttentionComparison),
  tableRecordSchema.parse(sparseAttentionComparison),
];

const tablesById = new Map(tableRecords.map((record) => [record.id, record]));

/** Synchronous table lookup for client comparison renderers and tests. */
export function getTableById(tableId: string): TableRecord | undefined {
  return tablesById.get(tableId);
}

export function listTableRecords(): TableRecord[] {
  return [...tableRecords];
}
