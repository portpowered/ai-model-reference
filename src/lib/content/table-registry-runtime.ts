import groupedQueryAttentionComparison from "@/content/registry/tables/grouped-query-attention-comparison.json";
import { type TableRecord, tableRecordSchema } from "@/lib/content/schemas";

const tableRecords: TableRecord[] = [
  tableRecordSchema.parse(groupedQueryAttentionComparison),
];

const tablesById = new Map(tableRecords.map((record) => [record.id, record]));

/** Synchronous table lookup for client comparison renderers and tests. */
export function getTableById(tableId: string): TableRecord | undefined {
  return tablesById.get(tableId);
}

export function listTableRecords(): TableRecord[] {
  return [...tableRecords];
}
