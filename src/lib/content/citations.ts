import attentionIsAllYouNeed from "@/content/registry/citations/attention-is-all-you-need.json";
import bertPaper from "@/content/registry/citations/bert-paper.json";
import chinchillaPaper from "@/content/registry/citations/chinchilla-paper.json";
import claude3Family from "@/content/registry/citations/claude-3-family.json";
import deepseekR1Paper from "@/content/registry/citations/deepseek-r1-paper.json";
import deepseekV2MlaPaper from "@/content/registry/citations/deepseek-v2-mla-paper.json";
import deepseekV3TechnicalReport from "@/content/registry/citations/deepseek-v3-technical-report.json";
import falconSeriesPaper from "@/content/registry/citations/falcon-series-paper.json";
import gemini25Report from "@/content/registry/citations/gemini-2-5-report.json";
import gemmaOpenModelsPaper from "@/content/registry/citations/gemma-open-models-paper.json";
import goodfellowDeepLearning from "@/content/registry/citations/goodfellow-deep-learning.json";
import gpt2Report from "@/content/registry/citations/gpt-2-report.json";
import gptOssIntroducing from "@/content/registry/citations/gpt-oss-introducing.json";
import gqaPaper from "@/content/registry/citations/gqa-paper.json";
import kaplanScalingLaws from "@/content/registry/citations/kaplan-scaling-laws.json";
import katharopoulosLinearAttentionPaper from "@/content/registry/citations/katharopoulos-linear-attention-paper.json";
import kingmaAdam from "@/content/registry/citations/kingma-adam.json";
import llama3HerdPaper from "@/content/registry/citations/llama-3-herd-of-models.json";
import mistral7bPaper from "@/content/registry/citations/mistral-7b-paper.json";
import mixtralOfExpertsPaper from "@/content/registry/citations/mixtral-of-experts-paper.json";
import olmoPaper from "@/content/registry/citations/olmo-paper.json";
import optPaper from "@/content/registry/citations/opt-paper.json";
import palmPaper from "@/content/registry/citations/palm-paper.json";
import phi3TechnicalReport from "@/content/registry/citations/phi-3-technical-report.json";
import pressAlibi from "@/content/registry/citations/press-alibi.json";
import qwen25TechnicalReport from "@/content/registry/citations/qwen2-5-technical-report.json";
import qwen2TechnicalReport from "@/content/registry/citations/qwen2-technical-report.json";
import qwen3TechnicalReport from "@/content/registry/citations/qwen3-technical-report.json";
import shazeerMqaPaper from "@/content/registry/citations/shazeer-mqa-paper.json";
import suRoformerRope from "@/content/registry/citations/su-roformer-rope.json";
import t5Paper from "@/content/registry/citations/t5-paper.json";
import weiEmergentAbilities from "@/content/registry/citations/wei-emergent-abilities.json";
import {
  type CitationRecord,
  citationRecordSchema,
} from "@/lib/content/schemas";

const citationRecords: CitationRecord[] = [
  citationRecordSchema.parse(attentionIsAllYouNeed),
  citationRecordSchema.parse(bertPaper),
  citationRecordSchema.parse(chinchillaPaper),
  citationRecordSchema.parse(claude3Family),
  citationRecordSchema.parse(deepseekR1Paper),
  citationRecordSchema.parse(deepseekV2MlaPaper),
  citationRecordSchema.parse(deepseekV3TechnicalReport),
  citationRecordSchema.parse(falconSeriesPaper),
  citationRecordSchema.parse(gemmaOpenModelsPaper),
  citationRecordSchema.parse(gemini25Report),
  citationRecordSchema.parse(goodfellowDeepLearning),
  citationRecordSchema.parse(gptOssIntroducing),
  citationRecordSchema.parse(gpt2Report),
  citationRecordSchema.parse(gqaPaper),
  citationRecordSchema.parse(kaplanScalingLaws),
  citationRecordSchema.parse(katharopoulosLinearAttentionPaper),
  citationRecordSchema.parse(kingmaAdam),
  citationRecordSchema.parse(llama3HerdPaper),
  citationRecordSchema.parse(mistral7bPaper),
  citationRecordSchema.parse(mixtralOfExpertsPaper),
  citationRecordSchema.parse(olmoPaper),
  citationRecordSchema.parse(optPaper),
  citationRecordSchema.parse(palmPaper),
  citationRecordSchema.parse(phi3TechnicalReport),
  citationRecordSchema.parse(pressAlibi),
  citationRecordSchema.parse(qwen2TechnicalReport),
  citationRecordSchema.parse(qwen25TechnicalReport),
  citationRecordSchema.parse(qwen3TechnicalReport),
  citationRecordSchema.parse(shazeerMqaPaper),
  citationRecordSchema.parse(suRoformerRope),
  citationRecordSchema.parse(t5Paper),
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
