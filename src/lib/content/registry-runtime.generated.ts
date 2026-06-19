/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 *
 * Source: scripts/generate-registry-runtime.ts
 * Authoritative inputs: registry JSON files under src/content/registry
 */

// biome-ignore assist/source/organizeImports: generated file preserves deterministic discovery order
import {
  PUBLISHED_DOCS_REGISTRY_IDS,
  type PublishedDocsRegistryIds,
} from "./published-docs-registry-ids";
import type { RelatedRegistryRecord } from "./related-docs";
import {
  type CitationRecord,
  type ConceptRecord,
  citationRecordSchema,
  conceptRecordSchema,
  type DatasetRecord,
  datasetRecordSchema,
  type ModelRecord,
  type ModuleRecord,
  modelRecordSchema,
  moduleRecordSchema,
  type OrganizationRecord,
  organizationRecordSchema,
  type PaperRecord,
  paperRecordSchema,
  type SystemRecord,
  systemRecordSchema,
  type TrainingRegimeRecord,
  trainingRegimeRecordSchema,
} from "./schemas";
import registryRecord_0 from "../../content/registry/modules/absolute-positional-embeddings.json";
import registryRecord_1 from "../../content/registry/modules/alibi.json";
import registryRecord_2 from "../../content/registry/modules/attention.json";
import registryRecord_3 from "../../content/registry/modules/batch-norm.json";
import registryRecord_4 from "../../content/registry/modules/bidirectional-attention.json";
import registryRecord_5 from "../../content/registry/modules/bpe.json";
import registryRecord_6 from "../../content/registry/modules/byte-level-tokenization.json";
import registryRecord_7 from "../../content/registry/modules/compressed-sparse-attention.json";
import registryRecord_8 from "../../content/registry/modules/deepseekmoe.json";
import registryRecord_9 from "../../content/registry/modules/feed-forward-network.json";
import registryRecord_10 from "../../content/registry/modules/group-norm.json";
import registryRecord_11 from "../../content/registry/modules/grouped-query-attention.json";
import registryRecord_12 from "../../content/registry/modules/heavily-compressed-attention.json";
import registryRecord_13 from "../../content/registry/modules/layer-norm.json";
import registryRecord_14 from "../../content/registry/modules/leaky-relu.json";
import registryRecord_15 from "../../content/registry/modules/learned-positional-embeddings.json";
import registryRecord_16 from "../../content/registry/modules/linear-attention.json";
import registryRecord_17 from "../../content/registry/modules/longrope.json";
import registryRecord_18 from "../../content/registry/modules/manifold-constrained-hyper-connections.json";
import registryRecord_19 from "../../content/registry/modules/mixture-of-experts.json";
import registryRecord_20 from "../../content/registry/modules/multi-head-attention.json";
import registryRecord_21 from "../../content/registry/modules/multi-head-latent-attention.json";
import registryRecord_22 from "../../content/registry/modules/multi-query-attention.json";
import registryRecord_23 from "../../content/registry/modules/nope.json";
import registryRecord_24 from "../../content/registry/modules/ntk-aware-rope-scaling.json";
import registryRecord_25 from "../../content/registry/modules/positional-interpolation.json";
import registryRecord_26 from "../../content/registry/modules/qk-norm.json";
import registryRecord_27 from "../../content/registry/modules/relative-position-bias.json";
import registryRecord_28 from "../../content/registry/modules/relu.json";
import registryRecord_29 from "../../content/registry/modules/rmsnorm.json";
import registryRecord_30 from "../../content/registry/modules/rope.json";
import registryRecord_31 from "../../content/registry/modules/sentencepiece.json";
import registryRecord_32 from "../../content/registry/modules/silu.json";
import registryRecord_33 from "../../content/registry/modules/sinusoidal-positional-embeddings.json";
import registryRecord_34 from "../../content/registry/modules/sliding-window-attention.json";
import registryRecord_35 from "../../content/registry/modules/sparse-attention.json";
import registryRecord_36 from "../../content/registry/modules/standard-ffn.json";
import registryRecord_37 from "../../content/registry/modules/superhot-rope.json";
import registryRecord_38 from "../../content/registry/modules/swiglu.json";
import registryRecord_39 from "../../content/registry/modules/t5-relative-position-bias.json";
import registryRecord_40 from "../../content/registry/modules/wordpiece.json";
import registryRecord_41 from "../../content/registry/modules/yarn.json";
import registryRecord_42 from "../../content/registry/concepts/absolute-positional-embeddings.json";
import registryRecord_43 from "../../content/registry/concepts/activation-quantization.json";
import registryRecord_44 from "../../content/registry/concepts/activation.json";
import registryRecord_45 from "../../content/registry/concepts/alibi.json";
import registryRecord_46 from "../../content/registry/concepts/alignment.json";
import registryRecord_47 from "../../content/registry/concepts/architecture.json";
import registryRecord_48 from "../../content/registry/concepts/autoregressive-generation.json";
import registryRecord_49 from "../../content/registry/concepts/backpropagation.json";
import registryRecord_50 from "../../content/registry/concepts/batch-norm.json";
import registryRecord_51 from "../../content/registry/concepts/calibration.json";
import registryRecord_52 from "../../content/registry/concepts/component.json";
import registryRecord_53 from "../../content/registry/concepts/computational-graph.json";
import registryRecord_54 from "../../content/registry/concepts/conditioning.json";
import registryRecord_55 from "../../content/registry/concepts/context-extension.json";
import registryRecord_56 from "../../content/registry/concepts/context-window.json";
import registryRecord_57 from "../../content/registry/concepts/decode.json";
import registryRecord_58 from "../../content/registry/concepts/decoder.json";
import registryRecord_59 from "../../content/registry/concepts/denoising-generation.json";
import registryRecord_60 from "../../content/registry/concepts/diffusion-model.json";
import registryRecord_61 from "../../content/registry/concepts/discriminative-model.json";
import registryRecord_62 from "../../content/registry/concepts/dynamic-quantization.json";
import registryRecord_63 from "../../content/registry/concepts/embedding.json";
import registryRecord_64 from "../../content/registry/concepts/emergent-behavior.json";
import registryRecord_65 from "../../content/registry/concepts/encoder-decoder.json";
import registryRecord_66 from "../../content/registry/concepts/encoder.json";
import registryRecord_67 from "../../content/registry/concepts/entropy.json";
import registryRecord_68 from "../../content/registry/concepts/feed-forward-network.json";
import registryRecord_69 from "../../content/registry/concepts/foundation-model.json";
import registryRecord_70 from "../../content/registry/concepts/generalization.json";
import registryRecord_71 from "../../content/registry/concepts/generative-model.json";
import registryRecord_72 from "../../content/registry/concepts/gradient.json";
import registryRecord_73 from "../../content/registry/concepts/greedy-decoding.json";
import registryRecord_74 from "../../content/registry/concepts/group-norm.json";
import registryRecord_75 from "../../content/registry/concepts/hidden-size.json";
import registryRecord_76 from "../../content/registry/concepts/kv-cache-quantization.json";
import registryRecord_77 from "../../content/registry/concepts/kv-cache.json";
import registryRecord_78 from "../../content/registry/concepts/latent-space.json";
import registryRecord_79 from "../../content/registry/concepts/latent.json";
import registryRecord_80 from "../../content/registry/concepts/layer-norm.json";
import registryRecord_81 from "../../content/registry/concepts/leaky-relu.json";
import registryRecord_82 from "../../content/registry/concepts/learned-positional-embeddings.json";
import registryRecord_83 from "../../content/registry/concepts/logit.json";
import registryRecord_84 from "../../content/registry/concepts/longrope.json";
import registryRecord_85 from "../../content/registry/concepts/loss-function.json";
import registryRecord_86 from "../../content/registry/concepts/mixture-of-experts.json";
import registryRecord_87 from "../../content/registry/concepts/modality.json";
import registryRecord_88 from "../../content/registry/concepts/model-capacity.json";
import registryRecord_89 from "../../content/registry/concepts/model.json";
import registryRecord_90 from "../../content/registry/concepts/module.json";
import registryRecord_91 from "../../content/registry/concepts/multimodal-model.json";
import registryRecord_92 from "../../content/registry/concepts/nope.json";
import registryRecord_93 from "../../content/registry/concepts/normalization.json";
import registryRecord_94 from "../../content/registry/concepts/ntk-aware-rope-scaling.json";
import registryRecord_95 from "../../content/registry/concepts/optimizer-state.json";
import registryRecord_96 from "../../content/registry/concepts/overfitting.json";
import registryRecord_97 from "../../content/registry/concepts/page-spec-workflow-sample.json";
import registryRecord_98 from "../../content/registry/concepts/parameter.json";
import registryRecord_99 from "../../content/registry/concepts/patch.json";
import registryRecord_100 from "../../content/registry/concepts/perplexity.json";
import registryRecord_101 from "../../content/registry/concepts/positional-encodings.json";
import registryRecord_102 from "../../content/registry/concepts/positional-interpolation.json";
import registryRecord_103 from "../../content/registry/concepts/post-training-quantization.json";
import registryRecord_104 from "../../content/registry/concepts/prefill-decode-split.json";
import registryRecord_105 from "../../content/registry/concepts/prefill.json";
import registryRecord_106 from "../../content/registry/concepts/qk-norm.json";
import registryRecord_107 from "../../content/registry/concepts/quantization-aware-training.json";
import registryRecord_108 from "../../content/registry/concepts/quantization.json";
import registryRecord_109 from "../../content/registry/concepts/relative-position-bias.json";
import registryRecord_110 from "../../content/registry/concepts/relu.json";
import registryRecord_111 from "../../content/registry/concepts/representation.json";
import registryRecord_112 from "../../content/registry/concepts/residual-connection.json";
import registryRecord_113 from "../../content/registry/concepts/rmsnorm.json";
import registryRecord_114 from "../../content/registry/concepts/rope.json";
import registryRecord_115 from "../../content/registry/concepts/sampling-overview.json";
import registryRecord_116 from "../../content/registry/concepts/scaling-law.json";
import registryRecord_117 from "../../content/registry/concepts/silu.json";
import registryRecord_118 from "../../content/registry/concepts/sinusoidal-positional-embeddings.json";
import registryRecord_119 from "../../content/registry/concepts/skip-connection.json";
import registryRecord_120 from "../../content/registry/concepts/softmax.json";
import registryRecord_121 from "../../content/registry/concepts/special-tokens.json";
import registryRecord_122 from "../../content/registry/concepts/standard-ffn.json";
import registryRecord_123 from "../../content/registry/concepts/superhot-rope.json";
import registryRecord_124 from "../../content/registry/concepts/swiglu.json";
import registryRecord_125 from "../../content/registry/concepts/t5-relative-position-bias.json";
import registryRecord_126 from "../../content/registry/concepts/temperature.json";
import registryRecord_127 from "../../content/registry/concepts/tensor.json";
import registryRecord_128 from "../../content/registry/concepts/token.json";
import registryRecord_129 from "../../content/registry/concepts/tokenizers-overview.json";
import registryRecord_130 from "../../content/registry/concepts/top-k-sampling.json";
import registryRecord_131 from "../../content/registry/concepts/top-p-sampling.json";
import registryRecord_132 from "../../content/registry/concepts/transformer-architecture.json";
import registryRecord_133 from "../../content/registry/concepts/transformer.json";
import registryRecord_134 from "../../content/registry/concepts/vector.json";
import registryRecord_135 from "../../content/registry/concepts/vocabulary-size.json";
import registryRecord_136 from "../../content/registry/concepts/weight-only-quantization.json";
import registryRecord_137 from "../../content/registry/concepts/why-4-bit-models-are-not-exactly-4x-faster.json";
import registryRecord_138 from "../../content/registry/concepts/why-long-context-is-hard.json";
import registryRecord_139 from "../../content/registry/concepts/world-model.json";
import registryRecord_140 from "../../content/registry/concepts/yarn.json";
import registryRecord_141 from "../../content/registry/models/deepseek-v4-flash.json";
import registryRecord_142 from "../../content/registry/models/deepseek-v4-pro.json";
import registryRecord_143 from "../../content/registry/models/gpt-3.json";
import registryRecord_144 from "../../content/registry/papers/deepseek-v4.json";
import registryRecord_145 from "../../content/registry/training-regimes/dpo.json";
import registryRecord_146 from "../../content/registry/training-regimes/fp4-quantization-aware-training.json";
import registryRecord_147 from "../../content/registry/training-regimes/on-policy-distillation.json";
import registryRecord_148 from "../../content/registry/training-regimes/specialist-training.json";
import registryRecord_149 from "../../content/registry/systems/expert-parallel-overlap.json";
import registryRecord_150 from "../../content/registry/systems/on-disk-kv-cache.json";
import registryRecord_151 from "../../content/registry/systems/routing.json";
import registryRecord_152 from "../../content/registry/datasets/deepseek-v4-specialist-corpus.json";
import registryRecord_153 from "../../content/registry/organizations/deepseek-ai.json";
import registryRecord_154 from "../../content/registry/citations/attention-is-all-you-need.json";
import registryRecord_155 from "../../content/registry/citations/awq.json";
import registryRecord_156 from "../../content/registry/citations/batch-normalization.json";
import registryRecord_157 from "../../content/registry/citations/brown-gpt-3.json";
import registryRecord_158 from "../../content/registry/citations/chen-positional-interpolation.json";
import registryRecord_159 from "../../content/registry/citations/classifier-free-diffusion-guidance.json";
import registryRecord_160 from "../../content/registry/citations/curious-case-neural-text-degeneration.json";
import registryRecord_161 from "../../content/registry/citations/deepseek-v2-mla-paper.json";
import registryRecord_162 from "../../content/registry/citations/deepseek-v4-paper.json";
import registryRecord_163 from "../../content/registry/citations/denoising-diffusion-probabilistic-models.json";
import registryRecord_164 from "../../content/registry/citations/ding-longrope.json";
import registryRecord_165 from "../../content/registry/citations/direct-preference-optimization.json";
import registryRecord_166 from "../../content/registry/citations/flamingo-visual-language-model.json";
import registryRecord_167 from "../../content/registry/citations/glu-variants-improve-transformer.json";
import registryRecord_168 from "../../content/registry/citations/goodfellow-deep-learning.json";
import registryRecord_169 from "../../content/registry/citations/gpt-2-report.json";
import registryRecord_170 from "../../content/registry/citations/gqa-paper.json";
import registryRecord_171 from "../../content/registry/citations/group-normalization.json";
import registryRecord_172 from "../../content/registry/citations/image-is-worth-16x16-words.json";
import registryRecord_173 from "../../content/registry/citations/kaiokendev-superhot.json";
import registryRecord_174 from "../../content/registry/citations/kaplan-scaling-laws.json";
import registryRecord_175 from "../../content/registry/citations/katharopoulos-linear-attention-paper.json";
import registryRecord_176 from "../../content/registry/citations/kingma-adam.json";
import registryRecord_177 from "../../content/registry/citations/kivi-kv-cache-quantization.json";
import registryRecord_178 from "../../content/registry/citations/kudo-sentencepiece.json";
import registryRecord_179 from "../../content/registry/citations/layer-normalization.json";
import registryRecord_180 from "../../content/registry/citations/learning-transferable-visual-models-from-natural-language-supervision.json";
import registryRecord_181 from "../../content/registry/citations/longformer.json";
import registryRecord_182 from "../../content/registry/citations/multilayer-feedforward-networks-are-universal-approximators.json";
import registryRecord_183 from "../../content/registry/citations/on-policy-distillation-of-language-models.json";
import registryRecord_184 from "../../content/registry/citations/peng-yarn.json";
import registryRecord_185 from "../../content/registry/citations/press-alibi.json";
import registryRecord_186 from "../../content/registry/citations/qlora.json";
import registryRecord_187 from "../../content/registry/citations/quantization-integer-only-inference.json";
import registryRecord_188 from "../../content/registry/citations/query-key-normalization-for-transformers.json";
import registryRecord_189 from "../../content/registry/citations/raffel-t5.json";
import registryRecord_190 from "../../content/registry/citations/rectified-linear-units-improve-restricted-boltzmann-machines.json";
import registryRecord_191 from "../../content/registry/citations/rectifier-nonlinearities-improve-neural-network-acoustic-models.json";
import registryRecord_192 from "../../content/registry/citations/root-mean-square-layer-normalization.json";
import registryRecord_193 from "../../content/registry/citations/self-attention-with-relative-position-representations.json";
import registryRecord_194 from "../../content/registry/citations/sennrich-bpe.json";
import registryRecord_195 from "../../content/registry/citations/shazeer-mqa-paper.json";
import registryRecord_196 from "../../content/registry/citations/sigmoid-weighted-linear-units.json";
import registryRecord_197 from "../../content/registry/citations/smoothquant.json";
import registryRecord_198 from "../../content/registry/citations/sparse-transformers.json";
import registryRecord_199 from "../../content/registry/citations/sparsely-gated-mixture-of-experts-layer.json";
import registryRecord_200 from "../../content/registry/citations/su-roformer-rope.json";
import registryRecord_201 from "../../content/registry/citations/training-language-models-to-follow-instructions-with-human-feedback.json";
import registryRecord_202 from "../../content/registry/citations/transformer-lms-without-positional-encodings.json";
import registryRecord_203 from "../../content/registry/citations/wei-emergent-abilities.json";
import registryRecord_204 from "../../content/registry/citations/world-models.json";

const moduleRecords: ModuleRecord[] = [
  moduleRecordSchema.parse(registryRecord_0),
  moduleRecordSchema.parse(registryRecord_1),
  moduleRecordSchema.parse(registryRecord_2),
  moduleRecordSchema.parse(registryRecord_3),
  moduleRecordSchema.parse(registryRecord_4),
  moduleRecordSchema.parse(registryRecord_5),
  moduleRecordSchema.parse(registryRecord_6),
  moduleRecordSchema.parse(registryRecord_7),
  moduleRecordSchema.parse(registryRecord_8),
  moduleRecordSchema.parse(registryRecord_9),
  moduleRecordSchema.parse(registryRecord_10),
  moduleRecordSchema.parse(registryRecord_11),
  moduleRecordSchema.parse(registryRecord_12),
  moduleRecordSchema.parse(registryRecord_13),
  moduleRecordSchema.parse(registryRecord_14),
  moduleRecordSchema.parse(registryRecord_15),
  moduleRecordSchema.parse(registryRecord_16),
  moduleRecordSchema.parse(registryRecord_17),
  moduleRecordSchema.parse(registryRecord_18),
  moduleRecordSchema.parse(registryRecord_19),
  moduleRecordSchema.parse(registryRecord_20),
  moduleRecordSchema.parse(registryRecord_21),
  moduleRecordSchema.parse(registryRecord_22),
  moduleRecordSchema.parse(registryRecord_23),
  moduleRecordSchema.parse(registryRecord_24),
  moduleRecordSchema.parse(registryRecord_25),
  moduleRecordSchema.parse(registryRecord_26),
  moduleRecordSchema.parse(registryRecord_27),
  moduleRecordSchema.parse(registryRecord_28),
  moduleRecordSchema.parse(registryRecord_29),
  moduleRecordSchema.parse(registryRecord_30),
  moduleRecordSchema.parse(registryRecord_31),
  moduleRecordSchema.parse(registryRecord_32),
  moduleRecordSchema.parse(registryRecord_33),
  moduleRecordSchema.parse(registryRecord_34),
  moduleRecordSchema.parse(registryRecord_35),
  moduleRecordSchema.parse(registryRecord_36),
  moduleRecordSchema.parse(registryRecord_37),
  moduleRecordSchema.parse(registryRecord_38),
  moduleRecordSchema.parse(registryRecord_39),
  moduleRecordSchema.parse(registryRecord_40),
  moduleRecordSchema.parse(registryRecord_41),
];

const conceptRecords: ConceptRecord[] = [
  conceptRecordSchema.parse(registryRecord_42),
  conceptRecordSchema.parse(registryRecord_43),
  conceptRecordSchema.parse(registryRecord_44),
  conceptRecordSchema.parse(registryRecord_45),
  conceptRecordSchema.parse(registryRecord_46),
  conceptRecordSchema.parse(registryRecord_47),
  conceptRecordSchema.parse(registryRecord_48),
  conceptRecordSchema.parse(registryRecord_49),
  conceptRecordSchema.parse(registryRecord_50),
  conceptRecordSchema.parse(registryRecord_51),
  conceptRecordSchema.parse(registryRecord_52),
  conceptRecordSchema.parse(registryRecord_53),
  conceptRecordSchema.parse(registryRecord_54),
  conceptRecordSchema.parse(registryRecord_55),
  conceptRecordSchema.parse(registryRecord_56),
  conceptRecordSchema.parse(registryRecord_57),
  conceptRecordSchema.parse(registryRecord_58),
  conceptRecordSchema.parse(registryRecord_59),
  conceptRecordSchema.parse(registryRecord_60),
  conceptRecordSchema.parse(registryRecord_61),
  conceptRecordSchema.parse(registryRecord_62),
  conceptRecordSchema.parse(registryRecord_63),
  conceptRecordSchema.parse(registryRecord_64),
  conceptRecordSchema.parse(registryRecord_65),
  conceptRecordSchema.parse(registryRecord_66),
  conceptRecordSchema.parse(registryRecord_67),
  conceptRecordSchema.parse(registryRecord_68),
  conceptRecordSchema.parse(registryRecord_69),
  conceptRecordSchema.parse(registryRecord_70),
  conceptRecordSchema.parse(registryRecord_71),
  conceptRecordSchema.parse(registryRecord_72),
  conceptRecordSchema.parse(registryRecord_73),
  conceptRecordSchema.parse(registryRecord_74),
  conceptRecordSchema.parse(registryRecord_75),
  conceptRecordSchema.parse(registryRecord_76),
  conceptRecordSchema.parse(registryRecord_77),
  conceptRecordSchema.parse(registryRecord_78),
  conceptRecordSchema.parse(registryRecord_79),
  conceptRecordSchema.parse(registryRecord_80),
  conceptRecordSchema.parse(registryRecord_81),
  conceptRecordSchema.parse(registryRecord_82),
  conceptRecordSchema.parse(registryRecord_83),
  conceptRecordSchema.parse(registryRecord_84),
  conceptRecordSchema.parse(registryRecord_85),
  conceptRecordSchema.parse(registryRecord_86),
  conceptRecordSchema.parse(registryRecord_87),
  conceptRecordSchema.parse(registryRecord_88),
  conceptRecordSchema.parse(registryRecord_89),
  conceptRecordSchema.parse(registryRecord_90),
  conceptRecordSchema.parse(registryRecord_91),
  conceptRecordSchema.parse(registryRecord_92),
  conceptRecordSchema.parse(registryRecord_93),
  conceptRecordSchema.parse(registryRecord_94),
  conceptRecordSchema.parse(registryRecord_95),
  conceptRecordSchema.parse(registryRecord_96),
  conceptRecordSchema.parse(registryRecord_97),
  conceptRecordSchema.parse(registryRecord_98),
  conceptRecordSchema.parse(registryRecord_99),
  conceptRecordSchema.parse(registryRecord_100),
  conceptRecordSchema.parse(registryRecord_101),
  conceptRecordSchema.parse(registryRecord_102),
  conceptRecordSchema.parse(registryRecord_103),
  conceptRecordSchema.parse(registryRecord_104),
  conceptRecordSchema.parse(registryRecord_105),
  conceptRecordSchema.parse(registryRecord_106),
  conceptRecordSchema.parse(registryRecord_107),
  conceptRecordSchema.parse(registryRecord_108),
  conceptRecordSchema.parse(registryRecord_109),
  conceptRecordSchema.parse(registryRecord_110),
  conceptRecordSchema.parse(registryRecord_111),
  conceptRecordSchema.parse(registryRecord_112),
  conceptRecordSchema.parse(registryRecord_113),
  conceptRecordSchema.parse(registryRecord_114),
  conceptRecordSchema.parse(registryRecord_115),
  conceptRecordSchema.parse(registryRecord_116),
  conceptRecordSchema.parse(registryRecord_117),
  conceptRecordSchema.parse(registryRecord_118),
  conceptRecordSchema.parse(registryRecord_119),
  conceptRecordSchema.parse(registryRecord_120),
  conceptRecordSchema.parse(registryRecord_121),
  conceptRecordSchema.parse(registryRecord_122),
  conceptRecordSchema.parse(registryRecord_123),
  conceptRecordSchema.parse(registryRecord_124),
  conceptRecordSchema.parse(registryRecord_125),
  conceptRecordSchema.parse(registryRecord_126),
  conceptRecordSchema.parse(registryRecord_127),
  conceptRecordSchema.parse(registryRecord_128),
  conceptRecordSchema.parse(registryRecord_129),
  conceptRecordSchema.parse(registryRecord_130),
  conceptRecordSchema.parse(registryRecord_131),
  conceptRecordSchema.parse(registryRecord_132),
  conceptRecordSchema.parse(registryRecord_133),
  conceptRecordSchema.parse(registryRecord_134),
  conceptRecordSchema.parse(registryRecord_135),
  conceptRecordSchema.parse(registryRecord_136),
  conceptRecordSchema.parse(registryRecord_137),
  conceptRecordSchema.parse(registryRecord_138),
  conceptRecordSchema.parse(registryRecord_139),
  conceptRecordSchema.parse(registryRecord_140),
];

const modelRecords: ModelRecord[] = [
  modelRecordSchema.parse(registryRecord_141),
  modelRecordSchema.parse(registryRecord_142),
  modelRecordSchema.parse(registryRecord_143),
];

const paperRecords: PaperRecord[] = [
  paperRecordSchema.parse(registryRecord_144),
];

const trainingRegimeRecords: TrainingRegimeRecord[] = [
  trainingRegimeRecordSchema.parse(registryRecord_145),
  trainingRegimeRecordSchema.parse(registryRecord_146),
  trainingRegimeRecordSchema.parse(registryRecord_147),
  trainingRegimeRecordSchema.parse(registryRecord_148),
];

const systemRecords: SystemRecord[] = [
  systemRecordSchema.parse(registryRecord_149),
  systemRecordSchema.parse(registryRecord_150),
  systemRecordSchema.parse(registryRecord_151),
];

const datasetRecords: DatasetRecord[] = [
  datasetRecordSchema.parse(registryRecord_152),
];

const organizationRecords: OrganizationRecord[] = [
  organizationRecordSchema.parse(registryRecord_153),
];

const citationRecords: CitationRecord[] = [
  citationRecordSchema.parse(registryRecord_154),
  citationRecordSchema.parse(registryRecord_155),
  citationRecordSchema.parse(registryRecord_156),
  citationRecordSchema.parse(registryRecord_157),
  citationRecordSchema.parse(registryRecord_158),
  citationRecordSchema.parse(registryRecord_159),
  citationRecordSchema.parse(registryRecord_160),
  citationRecordSchema.parse(registryRecord_161),
  citationRecordSchema.parse(registryRecord_162),
  citationRecordSchema.parse(registryRecord_163),
  citationRecordSchema.parse(registryRecord_164),
  citationRecordSchema.parse(registryRecord_165),
  citationRecordSchema.parse(registryRecord_166),
  citationRecordSchema.parse(registryRecord_167),
  citationRecordSchema.parse(registryRecord_168),
  citationRecordSchema.parse(registryRecord_169),
  citationRecordSchema.parse(registryRecord_170),
  citationRecordSchema.parse(registryRecord_171),
  citationRecordSchema.parse(registryRecord_172),
  citationRecordSchema.parse(registryRecord_173),
  citationRecordSchema.parse(registryRecord_174),
  citationRecordSchema.parse(registryRecord_175),
  citationRecordSchema.parse(registryRecord_176),
  citationRecordSchema.parse(registryRecord_177),
  citationRecordSchema.parse(registryRecord_178),
  citationRecordSchema.parse(registryRecord_179),
  citationRecordSchema.parse(registryRecord_180),
  citationRecordSchema.parse(registryRecord_181),
  citationRecordSchema.parse(registryRecord_182),
  citationRecordSchema.parse(registryRecord_183),
  citationRecordSchema.parse(registryRecord_184),
  citationRecordSchema.parse(registryRecord_185),
  citationRecordSchema.parse(registryRecord_186),
  citationRecordSchema.parse(registryRecord_187),
  citationRecordSchema.parse(registryRecord_188),
  citationRecordSchema.parse(registryRecord_189),
  citationRecordSchema.parse(registryRecord_190),
  citationRecordSchema.parse(registryRecord_191),
  citationRecordSchema.parse(registryRecord_192),
  citationRecordSchema.parse(registryRecord_193),
  citationRecordSchema.parse(registryRecord_194),
  citationRecordSchema.parse(registryRecord_195),
  citationRecordSchema.parse(registryRecord_196),
  citationRecordSchema.parse(registryRecord_197),
  citationRecordSchema.parse(registryRecord_198),
  citationRecordSchema.parse(registryRecord_199),
  citationRecordSchema.parse(registryRecord_200),
  citationRecordSchema.parse(registryRecord_201),
  citationRecordSchema.parse(registryRecord_202),
  citationRecordSchema.parse(registryRecord_203),
  citationRecordSchema.parse(registryRecord_204),
];

const modulesById = new Map<string, ModuleRecord>(
  moduleRecords.map((record) => [record.id, record]),
);
const conceptsById = new Map<string, ConceptRecord>(
  conceptRecords.map((record) => [record.id, record]),
);
const modelsById = new Map<string, ModelRecord>(
  modelRecords.map((record) => [record.id, record]),
);
const papersById = new Map<string, PaperRecord>(
  paperRecords.map((record) => [record.id, record]),
);
const trainingRegimesById = new Map<string, TrainingRegimeRecord>(
  trainingRegimeRecords.map((record) => [record.id, record]),
);
const systemsById = new Map<string, SystemRecord>(
  systemRecords.map((record) => [record.id, record]),
);
const datasetsById = new Map<string, DatasetRecord>(
  datasetRecords.map((record) => [record.id, record]),
);
const organizationsById = new Map<string, OrganizationRecord>(
  organizationRecords.map((record) => [record.id, record]),
);
const citationsById = new Map<string, CitationRecord>(
  citationRecords.map((record) => [record.id, record]),
);

type TaggedRegistryRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord
  | OrganizationRecord;

function getTaggedRecordById(
  registryId: string,
): TaggedRegistryRecord | undefined {
  return (
    modulesById.get(registryId) ??
    conceptsById.get(registryId) ??
    modelsById.get(registryId) ??
    papersById.get(registryId) ??
    trainingRegimesById.get(registryId) ??
    systemsById.get(registryId) ??
    datasetsById.get(registryId) ??
    organizationsById.get(registryId)
  );
}

/** Synchronous module lookup for client MDX components and tests. */
export function getModuleById(registryId: string): ModuleRecord | undefined {
  return modulesById.get(registryId);
}

/** Synchronous concept lookup for client MDX components and tests. */
export function getConceptById(registryId: string): ConceptRecord | undefined {
  return conceptsById.get(registryId);
}

/** Synchronous model lookup for docs components and tests. */
export function getModelById(registryId: string): ModelRecord | undefined {
  return modelsById.get(registryId);
}

export function getPaperById(registryId: string): PaperRecord | undefined {
  return papersById.get(registryId);
}

export function getTrainingRegimeById(
  registryId: string,
): TrainingRegimeRecord | undefined {
  return trainingRegimesById.get(registryId);
}

export function getSystemById(registryId: string): SystemRecord | undefined {
  return systemsById.get(registryId);
}

export function getDatasetById(registryId: string): DatasetRecord | undefined {
  return datasetsById.get(registryId);
}

export function getOrganizationById(
  registryId: string,
): OrganizationRecord | undefined {
  return organizationsById.get(registryId);
}

/** Synchronous citation lookup for source metadata and tests. */
export function getCitationById(
  registryId: string,
): CitationRecord | undefined {
  return citationsById.get(registryId);
}

export function listModuleRecords(): ModuleRecord[] {
  return [...moduleRecords];
}

export function listConceptRecords(): ConceptRecord[] {
  return [...conceptRecords];
}

export function listModelRecords(): ModelRecord[] {
  return [...modelRecords];
}

export function listPaperRecords(): PaperRecord[] {
  return [...paperRecords];
}

export function listTrainingRegimeRecords(): TrainingRegimeRecord[] {
  return [...trainingRegimeRecords];
}

export function listSystemRecords(): SystemRecord[] {
  return [...systemRecords];
}

/** Registry records used for derived related-document groups. */
export function listRelatedRegistryRecords(): RelatedRegistryRecord[] {
  return [
    ...moduleRecords,
    ...conceptRecords,
    ...modelRecords,
    ...paperRecords,
    ...trainingRegimeRecords,
    ...systemRecords,
    ...datasetRecords,
    ...organizationRecords,
  ];
}

/** Synchronous registry lookup for related-doc capable registry records. */
export function getRegistryRecordById(
  registryId: string,
): RelatedRegistryRecord | undefined {
  return getTaggedRecordById(registryId);
}

/** Registry ids with a published docs page (used to avoid broken related links). */
export function getPublishedDocsRegistryIds(): PublishedDocsRegistryIds {
  return PUBLISHED_DOCS_REGISTRY_IDS;
}

/** Tags declared on a registry record, when the record exists. */
export function getRegistryTags(registryId: string): string[] | undefined {
  return getTaggedRecordById(registryId)?.tags;
}

/** Citation IDs declared on a registry record, when the record exists. */
export function getRegistryCitationIds(
  registryId: string,
): string[] | undefined {
  return getTaggedRecordById(registryId)?.citationIds;
}
