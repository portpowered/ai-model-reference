import { graphRecords } from "@/lib/content/generated/graph-registry-runtime.generated";
import type { GraphRecord } from "@/lib/content/schemas";

const graphsById = new Map(graphRecords.map((record) => [record.id, record]));
const graphOverridesById = new Map<string, GraphRecord>();

export function registerGraphRecords(records: readonly GraphRecord[]): void {
  for (const record of records) {
    graphOverridesById.set(record.id, record);
  }
}

export function clearRegisteredGraphRecords(): void {
  graphOverridesById.clear();
}

/** Synchronous graph lookup for client graph renderers and tests. */
export function getGraphById(graphId: string): GraphRecord | undefined {
  return graphOverridesById.get(graphId) ?? graphsById.get(graphId);
}

export function listGraphRecords(): GraphRecord[] {
  return [...graphRecords];
}
