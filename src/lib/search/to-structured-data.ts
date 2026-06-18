import type {
  FumadocsSearchIndexEntry,
  FumadocsStructuredData,
  SearchDocument,
} from "./types";

export function toStructuredData(
  document: SearchDocument,
): FumadocsStructuredData {
  const headings = document.headings.map((heading, index) => ({
    id: `heading-${index}`,
    content: heading,
  }));

  const contents: FumadocsStructuredData["contents"] = [
    {
      heading: document.title,
      content: [document.description, document.bodyText]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  if (document.aliases.length > 0) {
    contents.push({
      heading: undefined,
      content: document.aliases.join("\n"),
    });
  }

  if (document.tags.length > 0) {
    contents.push({
      heading: undefined,
      content: document.tags.join("\n"),
    });
  }

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
