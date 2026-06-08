import attentionIsAllYouNeed from "@/content/registry/citations/attention-is-all-you-need.json";
import deepseekV2MlaPaper from "@/content/registry/citations/deepseek-v2-mla-paper.json";
import goodfellowDeepLearning from "@/content/registry/citations/goodfellow-deep-learning.json";
import gqaPaper from "@/content/registry/citations/gqa-paper.json";
import kaplanScalingLaws from "@/content/registry/citations/kaplan-scaling-laws.json";
import katharopoulosLinearAttentionPaper from "@/content/registry/citations/katharopoulos-linear-attention-paper.json";
import kingmaAdam from "@/content/registry/citations/kingma-adam.json";
import pressAlibi from "@/content/registry/citations/press-alibi.json";
import shazeerMqaPaper from "@/content/registry/citations/shazeer-mqa-paper.json";
import suRoformerRope from "@/content/registry/citations/su-roformer-rope.json";
import weiEmergentAbilities from "@/content/registry/citations/wei-emergent-abilities.json";
import {
  type CitationRecord,
  citationRecordSchema,
} from "@/lib/content/schemas";

const citationRecords: CitationRecord[] = [
  citationRecordSchema.parse(attentionIsAllYouNeed),
  citationRecordSchema.parse(deepseekV2MlaPaper),
  citationRecordSchema.parse(goodfellowDeepLearning),
  citationRecordSchema.parse(gqaPaper),
  citationRecordSchema.parse(kaplanScalingLaws),
  citationRecordSchema.parse(katharopoulosLinearAttentionPaper),
  citationRecordSchema.parse(kingmaAdam),
  citationRecordSchema.parse(pressAlibi),
  citationRecordSchema.parse(shazeerMqaPaper),
  citationRecordSchema.parse(suRoformerRope),
  citationRecordSchema.parse(weiEmergentAbilities),
];

const citationsById = new Map(
  citationRecords.map((record) => [record.id, record]),
);

export function getCitationById(
  citationId: string,
): CitationRecord | undefined {
  return citationsById.get(citationId);
}

/** Resolves citation IDs to registry records, preserving order and skipping unknown IDs. */
export function resolveCitations(citationIds: string[]): CitationRecord[] {
  const resolved: CitationRecord[] = [];
  for (const id of citationIds) {
    const record = getCitationById(id);
    if (record) {
      resolved.push(record);
    }
  }
  return resolved;
}

export function listCitationRecords(): CitationRecord[] {
  return [...citationRecords];
}
