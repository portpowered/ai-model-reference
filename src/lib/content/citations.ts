import {
  getCitationById as getDerivedCitationById,
  listCitationRecords as listDerivedCitationRecords,
} from "@/lib/content/registry-runtime";
import type { CitationRecord } from "@/lib/content/schemas";

export function getCitationById(
  citationId: string,
): CitationRecord | undefined {
  return getDerivedCitationById(citationId);
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
  return listDerivedCitationRecords();
}
