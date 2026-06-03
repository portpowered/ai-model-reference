/** Resolves the initial inline search query from `/search` URL params. */
export function resolveInitialSearchPageQuery(
  queryParam: string | null,
  tagParam: string | null,
): string {
  const fromQuery = queryParam?.trim();
  if (fromQuery) {
    return fromQuery;
  }
  const fromTag = tagParam?.trim();
  if (fromTag) {
    return fromTag;
  }
  return "";
}
