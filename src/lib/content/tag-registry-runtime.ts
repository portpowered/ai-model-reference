import attentionTag from "@/content/registry/tags/attention.json";
import foundationsTag from "@/content/registry/tags/foundations.json";
import kvCacheTag from "@/content/registry/tags/kv-cache.json";
import modelFamilyTag from "@/content/registry/tags/model-family.json";
import taxonomyTag from "@/content/registry/tags/taxonomy.json";
import tokenToProbabilityChainTag from "@/content/registry/tags/token-to-probability-chain.json";
import { type TagRecord, tagRecordSchema } from "@/lib/content/schemas";

const tagRecords: TagRecord[] = [
  tagRecordSchema.parse(attentionTag),
  tagRecordSchema.parse(foundationsTag),
  tagRecordSchema.parse(kvCacheTag),
  tagRecordSchema.parse(modelFamilyTag),
  tagRecordSchema.parse(taxonomyTag),
  tagRecordSchema.parse(tokenToProbabilityChainTag),
];

const tagsById = new Map(tagRecords.map((record) => [record.id, record]));

/** Synchronous tag lookup for client prose auto-linking and tests. */
export function getTagById(tagId: string): TagRecord | undefined {
  return tagsById.get(tagId);
}

export function listTagRecords(): TagRecord[] {
  return [...tagRecords];
}
