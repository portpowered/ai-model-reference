import { createContentHighlighter } from "fumadocs-core/search";

/** Strip Orama/Fumadocs `<mark>` wrappers for accessible plain-text labels. */
export function stripSearchResultTitleMarks(content: string): string {
  return content.replace(/<\/?mark>/gi, "");
}

/** Return markdown title content with query-match `<mark>` segments when needed. */
export function resolveSearchResultTitleContent(
  content: string,
  query: string,
): string {
  if (content.includes("<mark>")) {
    return content;
  }

  const plain = stripSearchResultTitleMarks(content);
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return plain;
  }

  return createContentHighlighter(trimmedQuery).highlightMarkdown(plain);
}
