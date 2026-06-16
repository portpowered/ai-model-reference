import groupedQueryAttentionComputeFlow from "@/content/registry/graphs/grouped-query-attention-compute-flow.json";
import groupedQueryAttentionComputeSchema from "@/content/registry/graphs/grouped-query-attention-compute-schema.json";
import groupedQueryAttentionGqaComparison from "@/content/registry/graphs/grouped-query-attention-gqa-comparison.json";
import groupedQueryAttentionMhaComparison from "@/content/registry/graphs/grouped-query-attention-mha-comparison.json";
import linearAttentionLinearComparison from "@/content/registry/graphs/linear-attention-linear-comparison.json";
import linearAttentionMhaComparison from "@/content/registry/graphs/linear-attention-mha-comparison.json";
import multiHeadAttentionMhaComparison from "@/content/registry/graphs/multi-head-attention-mha-comparison.json";
import multiHeadAttentionMqaComparison from "@/content/registry/graphs/multi-head-attention-mqa-comparison.json";
import multiHeadAttentionTimePattern from "@/content/registry/graphs/multi-head-attention-time-pattern.json";
import multiHeadLatentAttentionMhaComparison from "@/content/registry/graphs/multi-head-latent-attention-mha-comparison.json";
import multiHeadLatentAttentionMlaComparison from "@/content/registry/graphs/multi-head-latent-attention-mla-comparison.json";
import multiQueryAttentionMhaComparison from "@/content/registry/graphs/multi-query-attention-mha-comparison.json";
import multiQueryAttentionMqaComparison from "@/content/registry/graphs/multi-query-attention-mqa-comparison.json";
import pageSpecWorkflowSampleConceptMap from "@/content/registry/graphs/page-spec-workflow-sample-concept-map.json";
import slidingWindowAttentionTimeWindowPattern from "@/content/registry/graphs/sliding-window-attention-time-window-pattern.json";
import sparseAttentionTimePattern from "@/content/registry/graphs/sparse-attention-time-pattern.json";
import tokenConceptMap from "@/content/registry/graphs/token-concept-map.json";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

const graphRecords: GraphRecord[] = [
  graphRecordSchema.parse(groupedQueryAttentionComputeFlow),
  graphRecordSchema.parse(groupedQueryAttentionComputeSchema),
  graphRecordSchema.parse(groupedQueryAttentionMhaComparison),
  graphRecordSchema.parse(groupedQueryAttentionGqaComparison),
  graphRecordSchema.parse(multiHeadAttentionMhaComparison),
  graphRecordSchema.parse(multiHeadAttentionMqaComparison),
  graphRecordSchema.parse(multiHeadAttentionTimePattern),
  graphRecordSchema.parse(multiQueryAttentionMhaComparison),
  graphRecordSchema.parse(multiQueryAttentionMqaComparison),
  graphRecordSchema.parse(linearAttentionMhaComparison),
  graphRecordSchema.parse(linearAttentionLinearComparison),
  graphRecordSchema.parse(multiHeadLatentAttentionMhaComparison),
  graphRecordSchema.parse(multiHeadLatentAttentionMlaComparison),
  graphRecordSchema.parse(slidingWindowAttentionTimeWindowPattern),
  graphRecordSchema.parse(sparseAttentionTimePattern),
  graphRecordSchema.parse(pageSpecWorkflowSampleConceptMap),
  graphRecordSchema.parse(tokenConceptMap),
];

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
