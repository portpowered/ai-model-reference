import type {
  FumadocsSearchIndexEntry,
  FumadocsStructuredData,
  SearchDocument,
} from "./types";

function slugSearchTerm(url: string): string | undefined {
  const slug = url.split("/").pop();
  if (!slug) {
    return undefined;
  }

  return slug.replace(/-/g, " ");
}

function exactMatchKeywords(document: SearchDocument): string[] {
  const title = document.title.trim();
  const normalizedTitle = title.toLowerCase();
  const slugTerm = slugSearchTerm(document.url);
  const weightedKeywords = [
    title,
    normalizedTitle !== title ? normalizedTitle : undefined,
    slugTerm,
    slugTerm,
    ...document.aliases,
    ...document.tags,
  ];

  // Keep repeated exact-match sources so the raw static client still surfaces
  // canonical overview pages ahead of fragment-heavy broad-topic matches.
  return weightedKeywords.filter((value): value is string => Boolean(value));
}

export function toStructuredData(
  document: SearchDocument,
): FumadocsStructuredData {
  const headings = document.headings.map((heading, index) => ({
    id: `heading-${index}`,
    content: heading,
  }));

  const contents = [
    {
      heading: document.title,
      content: [document.description, document.bodyText]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...exactMatchKeywords(document).map((keyword) => ({
      heading: undefined,
      content: keyword,
    })),
  ];

  return { headings, contents };
}

export function toFumadocsIndexEntry(
  document: SearchDocument,
): FumadocsSearchIndexEntry {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    url: document.url,
    structuredData: toStructuredData(document),
  };
}
