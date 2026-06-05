import type { SortedResult } from "fumadocs-core/search";
import type { SearchDocument } from "./types";

export function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

function isCanonicalPageHit(result: SortedResult): boolean {
  return result.type === "page" && result.url === pageBaseUrl(result.url);
}

function pickCanonicalHit(
  group: SortedResult[],
  document: SearchDocument | undefined,
): SortedResult {
  const baseUrl = pageBaseUrl(group[0]?.url ?? "");

  const canonicalPage = group.find(isCanonicalPageHit);
  if (canonicalPage) {
    return { ...canonicalPage, url: baseUrl };
  }

  const pageHit = group.find((result) => result.type === "page");
  if (pageHit) {
    return {
      ...pageHit,
      type: "page",
      url: baseUrl,
      content: document?.title ?? pageHit.content,
      id: document?.id ?? baseUrl,
    };
  }

  const title = document?.title ?? group[0]?.content ?? baseUrl;
  const seed = group[0];
  if (!seed) {
    return {
      id: baseUrl,
      type: "page",
      url: baseUrl,
      content: title,
    };
  }

  return {
    ...seed,
    type: "page",
    url: baseUrl,
    id: document?.id ?? baseUrl,
    content: title,
  };
}

/** Collapse fragment, heading, and duplicate page hits to one canonical row per page URL. */
export function collapseSearchResultsToPageHits(
  results: SortedResult[],
  documentsByUrl: Map<string, SearchDocument>,
): SortedResult[] {
  const order: string[] = [];
  const groups = new Map<string, SortedResult[]>();

  for (const result of results) {
    const base = pageBaseUrl(result.url);
    const existing = groups.get(base);
    if (existing) {
      existing.push(result);
      continue;
    }
    order.push(base);
    groups.set(base, [result]);
  }

  return order.map((base) =>
    pickCanonicalHit(groups.get(base) ?? [], documentsByUrl.get(base)),
  );
}
