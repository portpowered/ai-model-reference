import { getCitationById, getPaperById } from "@/lib/content/registry-runtime";
import type {
  ConceptRecord,
  ModelRecord,
  ModuleRecord,
  PaperRecord,
  SystemRecord,
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
  | SystemRecord
  | TrainingRegimeRecord;

function resolveSource(sourceId: string | undefined) {
  if (!sourceId) {
    return undefined;
  }

  const sourceRecord = getCitationById(sourceId);
  if (sourceRecord) {
    return {
      title: sourceRecord.title,
      url: sourceRecord.url,
    };
  }

  const paperRecord = getPaperById(sourceId);
  if (!paperRecord) {
    return undefined;
  }

  return {
    title: paperRecord.aliases[0] ?? paperRecord.slug,
    url: paperRecord.url,
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
      source: {
        title: record.aliases[0] ?? record.slug,
        url: record.url,
      },
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
