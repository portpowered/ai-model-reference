import tokenMessages from "@/content/docs/glossary/token/messages/en.json";
import groupedQueryAttentionMessages from "@/content/docs/modules/grouped-query-attention/messages/en.json";
import linearAttentionMessages from "@/content/docs/modules/linear-attention/messages/en.json";
import multiHeadAttentionMessages from "@/content/docs/modules/multi-head-attention/messages/en.json";
import multiHeadLatentAttentionMessages from "@/content/docs/modules/multi-head-latent-attention/messages/en.json";
import multiQueryAttentionMessages from "@/content/docs/modules/multi-query-attention/messages/en.json";
import slidingWindowAttentionMessages from "@/content/docs/modules/sliding-window-attention/messages/en.json";
import sparseAttentionMessages from "@/content/docs/modules/sparse-attention/messages/en.json";
import { type PageMessages, pageMessagesSchema } from "@/lib/content/schemas";

const messagesBySubjectId = new Map<string, PageMessages>([
  [
    "module.grouped-query-attention",
    pageMessagesSchema.parse(groupedQueryAttentionMessages),
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
    "module.sliding-window-attention",
    pageMessagesSchema.parse(slidingWindowAttentionMessages),
  ],
  [
    "module.sparse-attention",
    pageMessagesSchema.parse(sparseAttentionMessages),
  ],
  ["concept.token", pageMessagesSchema.parse(tokenMessages)],
]);

/** Returns canonical subject messages for registry-backed graphs when available. */
export function getGraphSubjectMessages(
  subjectId: string,
): PageMessages | undefined {
  return messagesBySubjectId.get(subjectId);
}
