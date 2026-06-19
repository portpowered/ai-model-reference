import type { SortedResult } from "fumadocs-core/search";
import { pageBaseUrl } from "./collapse-search-results-to-page-hits";
import type { SearchDocument } from "./types";

function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugFromUrl(url: string): string {
  const segment = url.split("/").pop() ?? "";
  return segment.replace(/-/g, " ");
}

function hasExactTagMatch(query: string, document: SearchDocument): boolean {
  const normalizedQuery = normalizeSearchTerm(query);
  return document.tags.some(
    (tag) => normalizeSearchTerm(tag) === normalizedQuery,
  );
}

function scoreDocumentMatch(query: string, document: SearchDocument): number {
  const normalizedQuery = normalizeSearchTerm(query);
  const normalizedTitle = normalizeSearchTerm(document.title);

  if (normalizedTitle === normalizedQuery) {
    return 100;
  }

  for (const alias of document.aliases) {
    if (normalizeSearchTerm(alias) === normalizedQuery) {
      return 95;
    }
  }

  const normalizedSlug = normalizeSearchTerm(slugFromUrl(document.url));
  if (normalizedSlug === normalizedQuery) {
    return 90;
  }

  return 0;
}

function kindTieBreakPriority(kind: SearchDocument["kind"]): number {
  switch (kind) {
    case "concept":
      return 0;
    case "glossary":
      return 1;
    case "model":
      return 2;
    case "paper":
      return 3;
    case "training-regime":
      return 4;
    case "system":
      return 5;
    case "module":
      return 6;
    default:
      return 7;
  }
}

export function findBestTitleMatchPageUrl(
  query: string,
  documentsByUrl: Map<string, SearchDocument>,
): string | undefined {
  let bestUrl: string | undefined;
  let bestScore = 0;
  let bestKindPriority = Number.POSITIVE_INFINITY;

  for (const [url, document] of documentsByUrl) {
    const score = scoreDocumentMatch(query, document);
    const kindPriority = kindTieBreakPriority(document.kind);

    if (
      score > bestScore ||
      (score === bestScore && score >= 90 && kindPriority < bestKindPriority)
    ) {
      bestScore = score;
      bestUrl = url;
      bestKindPriority = kindPriority;
    }
  }

  return bestScore >= 90 ? bestUrl : undefined;
}

/** Boost exact title, alias, or slug matches so glossary taxonomy pages rank above incidental body hits. */
export function rerankSearchResults(
  query: string,
  results: SortedResult[],
  documentsByUrl: Map<string, SearchDocument>,
): SortedResult[] {
  const bestPageUrl = findBestTitleMatchPageUrl(query, documentsByUrl);
  const hasTagMatch = [...documentsByUrl.values()].some((document) =>
    hasExactTagMatch(query, document),
  );

  if (!bestPageUrl && !hasTagMatch) {
    return results;
  }

  return [...results].sort((left, right) => {
    const leftUrl = pageBaseUrl(left.url);
    const rightUrl = pageBaseUrl(right.url);
    const leftDocument = documentsByUrl.get(leftUrl);
    const rightDocument = documentsByUrl.get(rightUrl);

    const leftPriority =
      leftUrl === bestPageUrl
        ? 0
        : leftDocument && hasExactTagMatch(query, leftDocument)
          ? leftDocument.kind === "module"
            ? 1
            : 2
          : 3;
    const rightPriority =
      rightUrl === bestPageUrl
        ? 0
        : rightDocument && hasExactTagMatch(query, rightDocument)
          ? rightDocument.kind === "module"
            ? 1
            : 2
          : 3;

    return leftPriority - rightPriority;
  });
}
