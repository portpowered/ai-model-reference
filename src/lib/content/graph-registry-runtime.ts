import groupedQueryAttentionComputeFlow from "@/content/registry/graphs/grouped-query-attention-compute-flow.json";
import groupedQueryAttentionComputeSchema from "@/content/registry/graphs/grouped-query-attention-compute-schema.json";
import groupedQueryAttentionGqaComparison from "@/content/registry/graphs/grouped-query-attention-gqa-comparison.json";
import groupedQueryAttentionMhaComparison from "@/content/registry/graphs/grouped-query-attention-mha-comparison.json";
import linearAttentionLinearComparison from "@/content/registry/graphs/linear-attention-linear-comparison.json";
import linearAttentionMhaComparison from "@/content/registry/graphs/linear-attention-mha-comparison.json";
import multiHeadLatentAttentionMhaComparison from "@/content/registry/graphs/multi-head-latent-attention-mha-comparison.json";
import multiHeadLatentAttentionMlaComparison from "@/content/registry/graphs/multi-head-latent-attention-mla-comparison.json";
import slidingWindowAttentionMhaComparison from "@/content/registry/graphs/sliding-window-attention-mha-comparison.json";
import slidingWindowAttentionWindowComparison from "@/content/registry/graphs/sliding-window-attention-window-comparison.json";
import sparseAttentionMhaComparison from "@/content/registry/graphs/sparse-attention-mha-comparison.json";
import sparseAttentionSparseComparison from "@/content/registry/graphs/sparse-attention-sparse-comparison.json";
import tokenConceptMap from "@/content/registry/graphs/token-concept-map.json";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

const graphRecords: GraphRecord[] = [
  graphRecordSchema.parse(groupedQueryAttentionComputeFlow),
  graphRecordSchema.parse(groupedQueryAttentionComputeSchema),
  graphRecordSchema.parse(groupedQueryAttentionMhaComparison),
  graphRecordSchema.parse(groupedQueryAttentionGqaComparison),
  graphRecordSchema.parse(linearAttentionMhaComparison),
  graphRecordSchema.parse(linearAttentionLinearComparison),
  graphRecordSchema.parse(multiHeadLatentAttentionMhaComparison),
  graphRecordSchema.parse(multiHeadLatentAttentionMlaComparison),
  graphRecordSchema.parse(slidingWindowAttentionMhaComparison),
  graphRecordSchema.parse(slidingWindowAttentionWindowComparison),
  graphRecordSchema.parse(sparseAttentionMhaComparison),
  graphRecordSchema.parse(sparseAttentionSparseComparison),
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
