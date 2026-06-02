import type { SearchDocument } from "./types";
import type { FumadocsSearchIndexEntry, FumadocsStructuredData } from "./types";

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
    ...document.aliases.map((alias) => ({
      content: alias,
    })),
    ...document.tags.map((tag) => ({
      content: tag,
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
