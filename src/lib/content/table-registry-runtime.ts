import { generatedTableRegistryPayloads } from "@/lib/content/generated/table-registry.generated";
import { type TableRecord, tableRecordSchema } from "@/lib/content/schemas";

const tableRecords: TableRecord[] = generatedTableRegistryPayloads.map(
  (record) => tableRecordSchema.parse(record),
);

const tablesById = new Map(tableRecords.map((record) => [record.id, record]));

/** Synchronous table lookup for client comparison renderers and tests. */
export function getTableById(tableId: string): TableRecord | undefined {
  return tablesById.get(tableId);
}

export function listTableRecords(): TableRecord[] {
  return [...tableRecords];
}
