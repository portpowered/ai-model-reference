import batchNormComputeFlow from "@/content/registry/graphs/batch-norm-compute-flow.json";
import feedForwardNetworkFamilyOverview from "@/content/registry/graphs/feed-forward-network-family-overview.json";
import gpt3Architecture from "@/content/registry/graphs/gpt-3-architecture.json";
import groupNormComputeFlow from "@/content/registry/graphs/group-norm-compute-flow.json";
import groupedQueryAttentionComputeFlow from "@/content/registry/graphs/grouped-query-attention-compute-flow.json";
import groupedQueryAttentionComputeSchema from "@/content/registry/graphs/grouped-query-attention-compute-schema.json";
import groupedQueryAttentionGqaComparison from "@/content/registry/graphs/grouped-query-attention-gqa-comparison.json";
import groupedQueryAttentionMhaComparison from "@/content/registry/graphs/grouped-query-attention-mha-comparison.json";
import layerNormComputeFlow from "@/content/registry/graphs/layer-norm-compute-flow.json";
import linearAttentionLinearComparison from "@/content/registry/graphs/linear-attention-linear-comparison.json";
import linearAttentionMhaComparison from "@/content/registry/graphs/linear-attention-mha-comparison.json";
import mixtureOfExpertsRoutingFlow from "@/content/registry/graphs/mixture-of-experts-routing-flow.json";
import multiHeadAttentionMhaComparison from "@/content/registry/graphs/multi-head-attention-mha-comparison.json";
import multiHeadAttentionMqaComparison from "@/content/registry/graphs/multi-head-attention-mqa-comparison.json";
import multiHeadAttentionTimePattern from "@/content/registry/graphs/multi-head-attention-time-pattern.json";
import multiHeadLatentAttentionMhaComparison from "@/content/registry/graphs/multi-head-latent-attention-mha-comparison.json";
import multiHeadLatentAttentionMlaComparison from "@/content/registry/graphs/multi-head-latent-attention-mla-comparison.json";
import multiQueryAttentionMhaComparison from "@/content/registry/graphs/multi-query-attention-mha-comparison.json";
import multiQueryAttentionMqaComparison from "@/content/registry/graphs/multi-query-attention-mqa-comparison.json";
import pageSpecWorkflowSampleConceptMap from "@/content/registry/graphs/page-spec-workflow-sample-concept-map.json";
import qkNormComputeFlow from "@/content/registry/graphs/qk-norm-compute-flow.json";
import rmsnormComputeFlow from "@/content/registry/graphs/rmsnorm-compute-flow.json";
import slidingWindowAttentionTimeWindowPattern from "@/content/registry/graphs/sliding-window-attention-time-window-pattern.json";
import sparseAttentionTimePattern from "@/content/registry/graphs/sparse-attention-time-pattern.json";
import standardFfnComputeFlow from "@/content/registry/graphs/standard-ffn-compute-flow.json";
import standardFfnParallelBaseline from "@/content/registry/graphs/standard-ffn-parallel-baseline.json";
import swigluComputeFlow from "@/content/registry/graphs/swiglu-compute-flow.json";
import tokenConceptMap from "@/content/registry/graphs/token-concept-map.json";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

const graphRecords: GraphRecord[] = [
  graphRecordSchema.parse(batchNormComputeFlow),
  graphRecordSchema.parse(feedForwardNetworkFamilyOverview),
  graphRecordSchema.parse(gpt3Architecture),
  graphRecordSchema.parse(groupNormComputeFlow),
  graphRecordSchema.parse(groupedQueryAttentionComputeFlow),
  graphRecordSchema.parse(groupedQueryAttentionComputeSchema),
  graphRecordSchema.parse(groupedQueryAttentionMhaComparison),
  graphRecordSchema.parse(groupedQueryAttentionGqaComparison),
  graphRecordSchema.parse(layerNormComputeFlow),
  graphRecordSchema.parse(multiHeadAttentionMhaComparison),
  graphRecordSchema.parse(multiHeadAttentionMqaComparison),
  graphRecordSchema.parse(multiHeadAttentionTimePattern),
  graphRecordSchema.parse(multiQueryAttentionMhaComparison),
  graphRecordSchema.parse(multiQueryAttentionMqaComparison),
  graphRecordSchema.parse(linearAttentionMhaComparison),
  graphRecordSchema.parse(linearAttentionLinearComparison),
  graphRecordSchema.parse(mixtureOfExpertsRoutingFlow),
  graphRecordSchema.parse(multiHeadLatentAttentionMhaComparison),
  graphRecordSchema.parse(multiHeadLatentAttentionMlaComparison),
  graphRecordSchema.parse(slidingWindowAttentionTimeWindowPattern),
  graphRecordSchema.parse(qkNormComputeFlow),
  graphRecordSchema.parse(rmsnormComputeFlow),
  graphRecordSchema.parse(standardFfnComputeFlow),
  graphRecordSchema.parse(standardFfnParallelBaseline),
  graphRecordSchema.parse(sparseAttentionTimePattern),
  graphRecordSchema.parse(swigluComputeFlow),
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
