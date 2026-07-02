import { generatedTableRegistryPayloads } from "@/lib/content/generated/table-registry.generated";
import { type TableRecord, tableRecordSchema } from "@/lib/content/schemas";

const tableRecords: TableRecord[] = generatedTableRegistryPayloads.map(
  (record) => tableRecordSchema.parse(record),
);

const tablesById = new Map(tableRecords.map((record) => [record.id, record]));
const tableOverridesById = new Map<string, TableRecord>();

export function registerTableRecords(records: readonly TableRecord[]): void {
  for (const record of records) {
    tableOverridesById.set(record.id, record);
  }
}

export function clearRegisteredTableRecords(): void {
  tableOverridesById.clear();
}

/** Synchronous table lookup for client table renderers and tests. */
export function getTableById(tableId: string): TableRecord | undefined {
  return tableOverridesById.get(tableId) ?? tablesById.get(tableId);
}

export function listTableRecords(): TableRecord[] {
  return [...tableRecords];
}
