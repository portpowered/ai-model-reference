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

export function findBestTitleMatchPageUrl(
  query: string,
  documentsByUrl: Map<string, SearchDocument>,
): string | undefined {
  let bestUrl: string | undefined;
  let bestScore = 0;

  for (const [url, document] of documentsByUrl) {
    const score = scoreDocumentMatch(query, document);
    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
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
  if (!bestPageUrl) {
    return results;
  }

  const boostedIndex = results.findIndex(
    (result) =>
      result.type === "page" && pageBaseUrl(result.url) === bestPageUrl,
  );
  if (boostedIndex <= 0) {
    return results;
  }

  const boosted = results[boostedIndex];
  const rest = results.filter((_, index) => index !== boostedIndex);
  return [boosted, ...rest];
}
