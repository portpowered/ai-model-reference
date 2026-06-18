import agenticEngineeringConceptMap from "@/content/registry/graphs/agentic-engineering-concept-map.json";
import asynchronousAgentReinforcementLearningTrainingFlow from "@/content/registry/graphs/asynchronous-agent-reinforcement-learning-training-flow.json";
import batchNormComputeFlow from "@/content/registry/graphs/batch-norm-compute-flow.json";
import bidirectionalAttentionTimePattern from "@/content/registry/graphs/bidirectional-attention-time-pattern.json";
import compressedSparseAttentionFlow from "@/content/registry/graphs/compressed-sparse-attention-flow.json";
import deepseekV4Contribution from "@/content/registry/graphs/deepseek-v4-contribution.json";
import deepseekV4FlashArchitecture from "@/content/registry/graphs/deepseek-v4-flash-architecture.json";
import deepseekV4ProArchitecture from "@/content/registry/graphs/deepseek-v4-pro-architecture.json";
import deepseekmoeRoutingFlow from "@/content/registry/graphs/deepseekmoe-routing-flow.json";
import expertParallelOverlapSystemFlow from "@/content/registry/graphs/expert-parallel-overlap-system-flow.json";
import feedForwardNetworkFamilyOverview from "@/content/registry/graphs/feed-forward-network-family-overview.json";
import fp4QuantizationAwareTrainingTrainingFlow from "@/content/registry/graphs/fp4-quantization-aware-training-training-flow.json";
import glm5Architecture from "@/content/registry/graphs/glm-5-architecture.json";
import glm5Contribution from "@/content/registry/graphs/glm-5-contribution.json";
import gpt3Architecture from "@/content/registry/graphs/gpt-3-architecture.json";
import groupNormComputeFlow from "@/content/registry/graphs/group-norm-compute-flow.json";
import groupedQueryAttentionComputeFlow from "@/content/registry/graphs/grouped-query-attention-compute-flow.json";
import groupedQueryAttentionComputeSchema from "@/content/registry/graphs/grouped-query-attention-compute-schema.json";
import groupedQueryAttentionGqaComparison from "@/content/registry/graphs/grouped-query-attention-gqa-comparison.json";
import groupedQueryAttentionMhaComparison from "@/content/registry/graphs/grouped-query-attention-mha-comparison.json";
import heavilyCompressedAttentionFlow from "@/content/registry/graphs/heavily-compressed-attention-flow.json";
import layerNormComputeFlow from "@/content/registry/graphs/layer-norm-compute-flow.json";
import leakyReluActivationFlow from "@/content/registry/graphs/leaky-relu-activation-flow.json";
import linearAttentionLinearComparison from "@/content/registry/graphs/linear-attention-linear-comparison.json";
import linearAttentionMhaComparison from "@/content/registry/graphs/linear-attention-mha-comparison.json";
import manifoldConstrainedHyperConnectionsFlow from "@/content/registry/graphs/manifold-constrained-hyper-connections-flow.json";
import mixtureOfExpertsRoutingFlow from "@/content/registry/graphs/mixture-of-experts-routing-flow.json";
import multiHeadAttentionMhaComparison from "@/content/registry/graphs/multi-head-attention-mha-comparison.json";
import multiHeadAttentionMqaComparison from "@/content/registry/graphs/multi-head-attention-mqa-comparison.json";
import multiHeadAttentionTimePattern from "@/content/registry/graphs/multi-head-attention-time-pattern.json";
import multiHeadLatentAttentionMhaComparison from "@/content/registry/graphs/multi-head-latent-attention-mha-comparison.json";
import multiHeadLatentAttentionMlaComparison from "@/content/registry/graphs/multi-head-latent-attention-mla-comparison.json";
import multiQueryAttentionMhaComparison from "@/content/registry/graphs/multi-query-attention-mha-comparison.json";
import multiQueryAttentionMqaComparison from "@/content/registry/graphs/multi-query-attention-mqa-comparison.json";
import onDiskKvCacheSystemFlow from "@/content/registry/graphs/on-disk-kv-cache-system-flow.json";
import onPolicyDistillationTrainingFlow from "@/content/registry/graphs/on-policy-distillation-training-flow.json";
import pageSpecWorkflowSampleConceptMap from "@/content/registry/graphs/page-spec-workflow-sample-concept-map.json";
import qkNormComputeFlow from "@/content/registry/graphs/qk-norm-compute-flow.json";
import reluActivationFlow from "@/content/registry/graphs/relu-activation-flow.json";
import rmsnormComputeFlow from "@/content/registry/graphs/rmsnorm-compute-flow.json";
import siluActivationFlow from "@/content/registry/graphs/silu-activation-flow.json";
import slidingWindowAttentionTimeWindowPattern from "@/content/registry/graphs/sliding-window-attention-time-window-pattern.json";
import slimeRolloutFrameworkSystemFlow from "@/content/registry/graphs/slime-rollout-framework-system-flow.json";
import sparseAttentionTimePattern from "@/content/registry/graphs/sparse-attention-time-pattern.json";
import specialistTrainingTrainingFlow from "@/content/registry/graphs/specialist-training-training-flow.json";
import standardFfnComputeFlow from "@/content/registry/graphs/standard-ffn-compute-flow.json";
import standardFfnParallelBaseline from "@/content/registry/graphs/standard-ffn-parallel-baseline.json";
import swigluComputeFlow from "@/content/registry/graphs/swiglu-compute-flow.json";
import tokenConceptMap from "@/content/registry/graphs/token-concept-map.json";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

const graphRecords: GraphRecord[] = [
  graphRecordSchema.parse(agenticEngineeringConceptMap),
  graphRecordSchema.parse(asynchronousAgentReinforcementLearningTrainingFlow),
  graphRecordSchema.parse(batchNormComputeFlow),
  graphRecordSchema.parse(bidirectionalAttentionTimePattern),
  graphRecordSchema.parse(compressedSparseAttentionFlow),
  graphRecordSchema.parse(deepseekV4Contribution),
  graphRecordSchema.parse(deepseekV4FlashArchitecture),
  graphRecordSchema.parse(deepseekV4ProArchitecture),
  graphRecordSchema.parse(deepseekmoeRoutingFlow),
  graphRecordSchema.parse(expertParallelOverlapSystemFlow),
  graphRecordSchema.parse(feedForwardNetworkFamilyOverview),
  graphRecordSchema.parse(fp4QuantizationAwareTrainingTrainingFlow),
  graphRecordSchema.parse(glm5Architecture),
  graphRecordSchema.parse(glm5Contribution),
  graphRecordSchema.parse(gpt3Architecture),
  graphRecordSchema.parse(groupNormComputeFlow),
  graphRecordSchema.parse(groupedQueryAttentionComputeFlow),
  graphRecordSchema.parse(groupedQueryAttentionComputeSchema),
  graphRecordSchema.parse(groupedQueryAttentionMhaComparison),
  graphRecordSchema.parse(groupedQueryAttentionGqaComparison),
  graphRecordSchema.parse(heavilyCompressedAttentionFlow),
  graphRecordSchema.parse(layerNormComputeFlow),
  graphRecordSchema.parse(leakyReluActivationFlow),
  graphRecordSchema.parse(linearAttentionMhaComparison),
  graphRecordSchema.parse(linearAttentionLinearComparison),
  graphRecordSchema.parse(manifoldConstrainedHyperConnectionsFlow),
  graphRecordSchema.parse(mixtureOfExpertsRoutingFlow),
  graphRecordSchema.parse(multiHeadAttentionMhaComparison),
  graphRecordSchema.parse(multiHeadAttentionMqaComparison),
  graphRecordSchema.parse(multiHeadAttentionTimePattern),
  graphRecordSchema.parse(multiHeadLatentAttentionMhaComparison),
  graphRecordSchema.parse(multiHeadLatentAttentionMlaComparison),
  graphRecordSchema.parse(multiQueryAttentionMhaComparison),
  graphRecordSchema.parse(multiQueryAttentionMqaComparison),
  graphRecordSchema.parse(onDiskKvCacheSystemFlow),
  graphRecordSchema.parse(onPolicyDistillationTrainingFlow),
  graphRecordSchema.parse(slidingWindowAttentionTimeWindowPattern),
  graphRecordSchema.parse(qkNormComputeFlow),
  graphRecordSchema.parse(rmsnormComputeFlow),
  graphRecordSchema.parse(siluActivationFlow),
  graphRecordSchema.parse(specialistTrainingTrainingFlow),
  graphRecordSchema.parse(slimeRolloutFrameworkSystemFlow),
  graphRecordSchema.parse(sparseAttentionTimePattern),
  graphRecordSchema.parse(standardFfnComputeFlow),
  graphRecordSchema.parse(standardFfnParallelBaseline),
  graphRecordSchema.parse(swigluComputeFlow),
  graphRecordSchema.parse(pageSpecWorkflowSampleConceptMap),
  graphRecordSchema.parse(reluActivationFlow),
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
