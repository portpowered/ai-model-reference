import type {
  FumadocsSearchIndexEntry,
  FumadocsStructuredData,
  SearchDocument,
} from "./types";

function unique(values: Array<string | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function slugSearchTerm(url: string): string | undefined {
  const slug = url.split("/").pop();
  if (!slug) {
    return undefined;
  }

  return slug.replace(/-/g, " ");
}

export function toStructuredData(
  document: SearchDocument,
): FumadocsStructuredData {
  const headings = document.headings.map((heading, index) => ({
    id: `heading-${index}`,
    content: heading,
  }));
  const exactMatchKeywords = unique([
    document.title,
    slugSearchTerm(document.url),
    ...document.aliases,
    ...document.tags,
  ]);

  const contents = [
    {
      heading: document.title,
      content: [document.description, document.bodyText]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...exactMatchKeywords.map((keyword) => ({
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
