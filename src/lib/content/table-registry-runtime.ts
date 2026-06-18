import batchNormComparison from "@/content/registry/tables/batch-norm-comparison.json";
import feedForwardNetworkComparison from "@/content/registry/tables/feed-forward-network-comparison.json";
import groupNormComparison from "@/content/registry/tables/group-norm-comparison.json";
import groupedQueryAttentionComparison from "@/content/registry/tables/grouped-query-attention-comparison.json";
import layerNormComparison from "@/content/registry/tables/layer-norm-comparison.json";
import linearAttentionComparison from "@/content/registry/tables/linear-attention-comparison.json";
import mixtureOfExpertsComparison from "@/content/registry/tables/mixture-of-experts-comparison.json";
import multiHeadAttentionComparison from "@/content/registry/tables/multi-head-attention-comparison.json";
import multiHeadLatentAttentionComparison from "@/content/registry/tables/multi-head-latent-attention-comparison.json";
import multiQueryAttentionComparison from "@/content/registry/tables/multi-query-attention-comparison.json";
import qkNormComparison from "@/content/registry/tables/qk-norm-comparison.json";
import rmsNormComparison from "@/content/registry/tables/rmsnorm-comparison.json";
import slidingWindowAttentionComparison from "@/content/registry/tables/sliding-window-attention-comparison.json";
import standardFfnComparison from "@/content/registry/tables/standard-ffn-comparison.json";
import sparseAttentionComparison from "@/content/registry/tables/sparse-attention-comparison.json";
import swigluComparison from "@/content/registry/tables/swiglu-comparison.json";
import { type TableRecord, tableRecordSchema } from "@/lib/content/schemas";

const tableRecords: TableRecord[] = [
  tableRecordSchema.parse(batchNormComparison),
  tableRecordSchema.parse(feedForwardNetworkComparison),
  tableRecordSchema.parse(groupNormComparison),
  tableRecordSchema.parse(groupedQueryAttentionComparison),
  tableRecordSchema.parse(layerNormComparison),
  tableRecordSchema.parse(multiHeadAttentionComparison),
  tableRecordSchema.parse(linearAttentionComparison),
  tableRecordSchema.parse(mixtureOfExpertsComparison),
  tableRecordSchema.parse(multiHeadLatentAttentionComparison),
  tableRecordSchema.parse(multiQueryAttentionComparison),
  tableRecordSchema.parse(qkNormComparison),
  tableRecordSchema.parse(rmsNormComparison),
  tableRecordSchema.parse(slidingWindowAttentionComparison),
  tableRecordSchema.parse(standardFfnComparison),
  tableRecordSchema.parse(sparseAttentionComparison),
  tableRecordSchema.parse(swigluComparison),
];

const tablesById = new Map(tableRecords.map((record) => [record.id, record]));

/** Synchronous table lookup for client comparison renderers and tests. */
export function getTableById(tableId: string): TableRecord | undefined {
  return tablesById.get(tableId);
}

export function listTableRecords(): TableRecord[] {
  return [...tableRecords];
}
