import groupedQueryAttentionComputeFlow from "@/content/registry/graphs/grouped-query-attention-compute-flow.json";
import groupedQueryAttentionComputeSchema from "@/content/registry/graphs/grouped-query-attention-compute-schema.json";
import tokenConceptMap from "@/content/registry/graphs/token-concept-map.json";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

const graphRecords: GraphRecord[] = [
  graphRecordSchema.parse(groupedQueryAttentionComputeFlow),
  graphRecordSchema.parse(groupedQueryAttentionComputeSchema),
  graphRecordSchema.parse(tokenConceptMap),
];

const graphsById = new Map(graphRecords.map((record) => [record.id, record]));

/** Synchronous graph lookup for client graph renderers and tests. */
export function getGraphById(graphId: string): GraphRecord | undefined {
  return graphsById.get(graphId);
}

export function listGraphRecords(): GraphRecord[] {
  return [...graphRecords];
}
