let pendingSearchQuery: string | undefined;

export function setPendingSearchQuery(query: string): void {
  pendingSearchQuery = query;
}

export function consumePendingSearchQuery(): string | undefined {
  const query = pendingSearchQuery;
  pendingSearchQuery = undefined;
  return query;
}
