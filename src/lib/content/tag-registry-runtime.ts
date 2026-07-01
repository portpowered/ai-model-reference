import {
  getTagById as getDerivedTagById,
  listTagRecords as listDerivedTagRecords,
} from "@/lib/content/registry-runtime";
import type { TagRecord } from "@/lib/content/schemas";

/** Synchronous tag lookup for client prose auto-linking and tests. */
export function getTagById(tagId: string): TagRecord | undefined {
  return getDerivedTagById(tagId);
}

export function listTagRecords(): TagRecord[] {
  return listDerivedTagRecords();
}
