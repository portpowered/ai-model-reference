import { getCitationById } from "@/lib/content/registry-runtime";
import type {
  ConceptRecord,
  ModelRecord,
  ModuleRecord,
  PaperRecord,
  TrainingRegimeRecord,
} from "@/lib/content/schemas";

export type PageReleaseMetadata = {
  authors: string[];
  dateLabel: "Released" | "Published";
  releaseDate?: string;
  source?: {
    title: string;
    url: string;
  };
};

export type ReleasablePageRecord =
  | ConceptRecord
  | ModelRecord
  | ModuleRecord
  | PaperRecord
  | TrainingRegimeRecord;

function resolveSource(sourceId: string | undefined) {
  if (!sourceId) {
    return undefined;
  }

  const sourceRecord = getCitationById(sourceId);
  if (!sourceRecord) {
    return undefined;
  }

  return {
    title: sourceRecord.title,
    url: sourceRecord.url,
  };
}

export function buildPageReleaseMetadata(
  record: ReleasablePageRecord | undefined,
): PageReleaseMetadata | null {
  if (!record) {
    return null;
  }

  if (record.kind === "paper") {
    return {
      authors: record.authors,
      dateLabel: "Published",
      releaseDate: record.publishedAt,
    };
  }

  const metadata: PageReleaseMetadata = {
    authors: record.authors ?? [],
    dateLabel: "Released",
    releaseDate: record.releaseDate,
    source: resolveSource(record.sourceId),
  };

  if (
    !metadata.releaseDate &&
    metadata.authors.length === 0 &&
    !metadata.source
  ) {
    return null;
  }

  return metadata;
}
