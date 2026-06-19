import { graphRecords } from "@/lib/content/graph-registry-runtime.generated";
import type { GraphRecord } from "@/lib/content/schemas";

const graphsById = new Map(graphRecords.map((record) => [record.id, record]));
const registeredGraphsById = new Map<string, GraphRecord>();

export function registerGraphRecords(records: readonly GraphRecord[]): void {
  for (const record of records) {
    registeredGraphsById.set(record.id, record);
  }
}

/** Synchronous graph lookup for client graph renderers and tests. */
export function getGraphById(graphId: string): GraphRecord | undefined {
  return registeredGraphsById.get(graphId) ?? graphsById.get(graphId);
}

export function listGraphRecords(): GraphRecord[] {
  return [...graphRecords];
}
