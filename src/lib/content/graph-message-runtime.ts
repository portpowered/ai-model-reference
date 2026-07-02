import transformerArchitectureMessages from "@/content/docs/concepts/transformer-architecture/messages/en.json";
import autoregressiveGenerationMessages from "@/content/docs/glossary/autoregressive-generation/messages/en.json";
import embeddingMessages from "@/content/docs/glossary/embedding/messages/en.json";
import softmaxMessages from "@/content/docs/glossary/softmax/messages/en.json";
import tokenMessages from "@/content/docs/glossary/token/messages/en.json";
import feedForwardNetworkMessages from "@/content/docs/modules/feed-forward-network/messages/en.json";
import groupedQueryAttentionMessages from "@/content/docs/modules/grouped-query-attention/messages/en.json";
import layerNormMessages from "@/content/docs/modules/layer-norm/messages/en.json";
import learnedPositionalEmbeddingsMessages from "@/content/docs/modules/learned-positional-embeddings/messages/en.json";
import linearAttentionMessages from "@/content/docs/modules/linear-attention/messages/en.json";
import mixtureOfExpertsMessages from "@/content/docs/modules/mixture-of-experts/messages/en.json";
import multiHeadAttentionMessages from "@/content/docs/modules/multi-head-attention/messages/en.json";
import multiHeadLatentAttentionMessages from "@/content/docs/modules/multi-head-latent-attention/messages/en.json";
import multiQueryAttentionMessages from "@/content/docs/modules/multi-query-attention/messages/en.json";
import rmsnormMessages from "@/content/docs/modules/rmsnorm/messages/en.json";
import slidingWindowAttentionMessages from "@/content/docs/modules/sliding-window-attention/messages/en.json";
import sparseAttentionMessages from "@/content/docs/modules/sparse-attention/messages/en.json";
import standardFfnMessages from "@/content/docs/modules/standard-ffn/messages/en.json";
import swigluMessages from "@/content/docs/modules/swiglu/messages/en.json";
import { type PageMessages, pageMessagesSchema } from "@/lib/content/schemas";

const messagesBySubjectId = new Map<string, PageMessages>([
  [
    "concept.autoregressive-generation",
    pageMessagesSchema.parse(autoregressiveGenerationMessages),
  ],
  ["concept.embedding", pageMessagesSchema.parse(embeddingMessages)],
  [
    "concept.feed-forward-network",
    pageMessagesSchema.parse(feedForwardNetworkMessages),
  ],
  ["concept.softmax", pageMessagesSchema.parse(softmaxMessages)],
  [
    "module.grouped-query-attention",
    pageMessagesSchema.parse(groupedQueryAttentionMessages),
  ],
  [
    "concept.transformer-architecture",
    pageMessagesSchema.parse(transformerArchitectureMessages),
  ],
  [
    "module.multi-head-attention",
    pageMessagesSchema.parse(multiHeadAttentionMessages),
  ],
  [
    "module.multi-query-attention",
    pageMessagesSchema.parse(multiQueryAttentionMessages),
  ],
  [
    "module.multi-head-latent-attention",
    pageMessagesSchema.parse(multiHeadLatentAttentionMessages),
  ],
  [
    "module.linear-attention",
    pageMessagesSchema.parse(linearAttentionMessages),
  ],
  [
    "module.learned-positional-embeddings",
    pageMessagesSchema.parse(learnedPositionalEmbeddingsMessages),
  ],
  ["module.layer-norm", pageMessagesSchema.parse(layerNormMessages)],
  [
    "concept.mixture-of-experts",
    pageMessagesSchema.parse(mixtureOfExpertsMessages),
  ],
  ["module.rmsnorm", pageMessagesSchema.parse(rmsnormMessages)],
  [
    "module.sliding-window-attention",
    pageMessagesSchema.parse(slidingWindowAttentionMessages),
  ],
  ["concept.standard-ffn", pageMessagesSchema.parse(standardFfnMessages)],
  ["module.standard-ffn", pageMessagesSchema.parse(standardFfnMessages)],
  [
    "module.sparse-attention",
    pageMessagesSchema.parse(sparseAttentionMessages),
  ],
  ["concept.swiglu", pageMessagesSchema.parse(swigluMessages)],
  ["concept.token", pageMessagesSchema.parse(tokenMessages)],
]);

/** Returns canonical subject messages for registry-backed graphs when available. */
export function getGraphSubjectMessages(
  subjectId: string,
): PageMessages | undefined {
  return messagesBySubjectId.get(subjectId);
}

export function getGraphRegistryMessages(
  registryId: string,
): PageMessages | undefined {
  return messagesBySubjectId.get(registryId);
}
