import attentionIsAllYouNeed from "@/content/registry/citations/attention-is-all-you-need.json";
import awq from "@/content/registry/citations/awq.json";
import batchNormalization from "@/content/registry/citations/batch-normalization.json";
import brownGpt3 from "@/content/registry/citations/brown-gpt-3.json";
import chenPositionalInterpolation from "@/content/registry/citations/chen-positional-interpolation.json";
import classifierFreeDiffusionGuidance from "@/content/registry/citations/classifier-free-diffusion-guidance.json";
import curiousCaseNeuralTextDegeneration from "@/content/registry/citations/curious-case-neural-text-degeneration.json";
import deepseekV2MlaPaper from "@/content/registry/citations/deepseek-v2-mla-paper.json";
import deepseekV4Paper from "@/content/registry/citations/deepseek-v4-paper.json";
import denoisingDiffusionProbabilisticModels from "@/content/registry/citations/denoising-diffusion-probabilistic-models.json";
import dingLongrope from "@/content/registry/citations/ding-longrope.json";
import flamingoVisualLanguageModel from "@/content/registry/citations/flamingo-visual-language-model.json";
import gluVariantsImproveTransformer from "@/content/registry/citations/glu-variants-improve-transformer.json";
import goodfellowDeepLearning from "@/content/registry/citations/goodfellow-deep-learning.json";
import gpt2Report from "@/content/registry/citations/gpt-2-report.json";
import gqaPaper from "@/content/registry/citations/gqa-paper.json";
import groupNormalization from "@/content/registry/citations/group-normalization.json";
import imageIsWorth16x16Words from "@/content/registry/citations/image-is-worth-16x16-words.json";
import kaiokendevSuperhot from "@/content/registry/citations/kaiokendev-superhot.json";
import kaplanScalingLaws from "@/content/registry/citations/kaplan-scaling-laws.json";
import katharopoulosLinearAttentionPaper from "@/content/registry/citations/katharopoulos-linear-attention-paper.json";
import kingmaAdam from "@/content/registry/citations/kingma-adam.json";
import kiviKvCacheQuantization from "@/content/registry/citations/kivi-kv-cache-quantization.json";
import kudoSentencepiece from "@/content/registry/citations/kudo-sentencepiece.json";
import layerNormalization from "@/content/registry/citations/layer-normalization.json";
import learningTransferableVisualModelsFromNaturalLanguageSupervision from "@/content/registry/citations/learning-transferable-visual-models-from-natural-language-supervision.json";
import longformer from "@/content/registry/citations/longformer.json";
import multilayerFeedforwardNetworksAreUniversalApproximators from "@/content/registry/citations/multilayer-feedforward-networks-are-universal-approximators.json";
import onPolicyDistillationOfLanguageModels from "@/content/registry/citations/on-policy-distillation-of-language-models.json";
import pengYarn from "@/content/registry/citations/peng-yarn.json";
import pressAlibi from "@/content/registry/citations/press-alibi.json";
import qlora from "@/content/registry/citations/qlora.json";
import quantizationIntegerOnlyInference from "@/content/registry/citations/quantization-integer-only-inference.json";
import queryKeyNormalizationForTransformers from "@/content/registry/citations/query-key-normalization-for-transformers.json";
import raffelT5 from "@/content/registry/citations/raffel-t5.json";
import rectifiedLinearUnitsImproveRestrictedBoltzmannMachines from "@/content/registry/citations/rectified-linear-units-improve-restricted-boltzmann-machines.json";
import rectifierNonlinearitiesImproveNeuralNetworkAcousticModels from "@/content/registry/citations/rectifier-nonlinearities-improve-neural-network-acoustic-models.json";
import rootMeanSquareLayerNormalization from "@/content/registry/citations/root-mean-square-layer-normalization.json";
import selfAttentionWithRelativePositionRepresentations from "@/content/registry/citations/self-attention-with-relative-position-representations.json";
import sennrichBpe from "@/content/registry/citations/sennrich-bpe.json";
import shazeerMqaPaper from "@/content/registry/citations/shazeer-mqa-paper.json";
import sigmoidWeightedLinearUnits from "@/content/registry/citations/sigmoid-weighted-linear-units.json";
import smoothquant from "@/content/registry/citations/smoothquant.json";
import sparseTransformers from "@/content/registry/citations/sparse-transformers.json";
import sparselyGatedMixtureOfExpertsLayer from "@/content/registry/citations/sparsely-gated-mixture-of-experts-layer.json";
import suRoformerRope from "@/content/registry/citations/su-roformer-rope.json";
import trainingLanguageModelsToFollowInstructionsWithHumanFeedback from "@/content/registry/citations/training-language-models-to-follow-instructions-with-human-feedback.json";
import transformerLanguageModelsWithoutPositionalEncodings from "@/content/registry/citations/transformer-lms-without-positional-encodings.json";
import weiEmergentAbilities from "@/content/registry/citations/wei-emergent-abilities.json";
import worldModels from "@/content/registry/citations/world-models.json";
import {
  type CitationRecord,
  citationRecordSchema,
} from "@/lib/content/schemas";

const citationRecords: CitationRecord[] = [
  citationRecordSchema.parse(attentionIsAllYouNeed),
  citationRecordSchema.parse(awq),
  citationRecordSchema.parse(brownGpt3),
  citationRecordSchema.parse(batchNormalization),
  citationRecordSchema.parse(chenPositionalInterpolation),
  citationRecordSchema.parse(classifierFreeDiffusionGuidance),
  citationRecordSchema.parse(curiousCaseNeuralTextDegeneration),
  citationRecordSchema.parse(deepseekV2MlaPaper),
  citationRecordSchema.parse(deepseekV4Paper),
  citationRecordSchema.parse(denoisingDiffusionProbabilisticModels),
  citationRecordSchema.parse(dingLongrope),
  citationRecordSchema.parse(flamingoVisualLanguageModel),
  citationRecordSchema.parse(goodfellowDeepLearning),
  citationRecordSchema.parse(gluVariantsImproveTransformer),
  citationRecordSchema.parse(gpt2Report),
  citationRecordSchema.parse(gqaPaper),
  citationRecordSchema.parse(groupNormalization),
  citationRecordSchema.parse(imageIsWorth16x16Words),
  citationRecordSchema.parse(kaiokendevSuperhot),
  citationRecordSchema.parse(kaplanScalingLaws),
  citationRecordSchema.parse(katharopoulosLinearAttentionPaper),
  citationRecordSchema.parse(kingmaAdam),
  citationRecordSchema.parse(kiviKvCacheQuantization),
  citationRecordSchema.parse(kudoSentencepiece),
  citationRecordSchema.parse(layerNormalization),
  citationRecordSchema.parse(
    learningTransferableVisualModelsFromNaturalLanguageSupervision,
  ),
  citationRecordSchema.parse(longformer),
  citationRecordSchema.parse(
    multilayerFeedforwardNetworksAreUniversalApproximators,
  ),
  citationRecordSchema.parse(onPolicyDistillationOfLanguageModels),
  citationRecordSchema.parse(pengYarn),
  citationRecordSchema.parse(pressAlibi),
  citationRecordSchema.parse(qlora),
  citationRecordSchema.parse(quantizationIntegerOnlyInference),
  citationRecordSchema.parse(queryKeyNormalizationForTransformers),
  citationRecordSchema.parse(raffelT5),
  citationRecordSchema.parse(
    rectifiedLinearUnitsImproveRestrictedBoltzmannMachines,
  ),
  citationRecordSchema.parse(
    rectifierNonlinearitiesImproveNeuralNetworkAcousticModels,
  ),
  citationRecordSchema.parse(rootMeanSquareLayerNormalization),
  citationRecordSchema.parse(selfAttentionWithRelativePositionRepresentations),
  citationRecordSchema.parse(sennrichBpe),
  citationRecordSchema.parse(sigmoidWeightedLinearUnits),
  citationRecordSchema.parse(smoothquant),
  citationRecordSchema.parse(sparseTransformers),
  citationRecordSchema.parse(sparselyGatedMixtureOfExpertsLayer),
  citationRecordSchema.parse(shazeerMqaPaper),
  citationRecordSchema.parse(suRoformerRope),
  citationRecordSchema.parse(
    trainingLanguageModelsToFollowInstructionsWithHumanFeedback,
  ),
  citationRecordSchema.parse(
    transformerLanguageModelsWithoutPositionalEncodings,
  ),
  citationRecordSchema.parse(weiEmergentAbilities),
  citationRecordSchema.parse(worldModels),
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
