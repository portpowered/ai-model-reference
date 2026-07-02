export type SearchPageHandoff = {
  q: string | null;
  tag: string | null;
  classification: string | null;
};

export const EMPTY_SEARCH_PAGE_HANDOFF: SearchPageHandoff = {
  q: null,
  tag: null,
  classification: null,
};

type NextSearchParams = Record<string, string | string[] | undefined>;

function readNextSearchParam(
  searchParams: NextSearchParams,
  key: "q" | "tag" | "classification",
): string | null {
  const value = searchParams[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const first = value[0]?.trim();
    return first && first.length > 0 ? first : null;
  }
  return null;
}

/** Resolves `/search` handoff values from server-known request search params. */
export function resolveSearchPageHandoff(
  searchParams: NextSearchParams | undefined,
): SearchPageHandoff {
  const params = searchParams ?? {};
  return {
    q: readNextSearchParam(params, "q"),
    tag: readNextSearchParam(params, "tag"),
    classification: readNextSearchParam(params, "classification"),
  };
}

export function hasSearchPageHandoff(handoff: SearchPageHandoff): boolean {
  return (
    handoff.q !== null ||
    handoff.tag !== null ||
    handoff.classification !== null
  );
}

/** Stable key for deduping URL handoff application in client effects. */
export function encodeSearchPageHandoffKey(handoff: SearchPageHandoff): string {
  return `${handoff.q ?? ""}\0${handoff.tag ?? ""}\0${handoff.classification ?? ""}`;
}

/** Reads `/search` handoff values from a browser location search string. */
export function readSearchPageHandoffFromLocationSearch(
  search = typeof window === "undefined" ? "" : window.location.search,
): SearchPageHandoff {
  return resolveSearchPageHandoff(
    Object.fromEntries(new URLSearchParams(search)),
  );
}

/** Resolves the initial inline search query from `/search` URL params. */
export function resolveInitialSearchPageQuery(
  queryParam: string | null,
  tagParam: string | null,
  classificationParam: string | null = null,
): string {
  const fromQuery = queryParam?.trim();
  if (fromQuery) {
    return fromQuery;
  }
  const fromTag = tagParam?.trim();
  if (fromTag) {
    return fromTag;
  }
  const fromClassification = classificationParam?.trim();
  if (fromClassification) {
    return fromClassification;
  }
  return "";
}
