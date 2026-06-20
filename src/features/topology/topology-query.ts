import { DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS } from "./topology-data";

export const TOPOLOGY_CLASSIFICATION_QUERY_KEY = "classification";

export type TopologyQueryState = {
  selectors: string[];
  usesDefault: boolean;
};

function normalizeSelector(selector: string): string {
  return selector.trim().toLowerCase();
}

function dedupeSelectors(selectors: readonly string[]): string[] {
  return [...new Set(selectors.map(normalizeSelector).filter(Boolean))];
}

export function getDefaultTopologySelectors(): string[] {
  return [...DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS];
}

export function parseTopologyQuery(
  searchParams: Pick<URLSearchParams, "getAll"> | null | undefined,
): TopologyQueryState {
  const values = searchParams?.getAll(TOPOLOGY_CLASSIFICATION_QUERY_KEY) ?? [];
  if (values.length === 0) {
    return {
      selectors: getDefaultTopologySelectors(),
      usesDefault: true,
    };
  }

  return {
    selectors: dedupeSelectors(values.flatMap((value) => value.split(","))),
    usesDefault: false,
  };
}

function hasDefaultSelectorSet(selectors: readonly string[]): boolean {
  const normalized = dedupeSelectors(selectors);
  const defaults = dedupeSelectors(DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS);

  return (
    normalized.length === defaults.length &&
    normalized.every((selector, index) => selector === defaults[index])
  );
}

export function buildTopologyHref(
  pathname: string,
  selectors: readonly string[],
  searchParams: Pick<URLSearchParams, "entries"> | null | undefined,
  options?: { explicitEmpty?: boolean },
): string {
  const nextParams = new URLSearchParams(
    searchParams ? [...searchParams.entries()] : undefined,
  );
  nextParams.delete(TOPOLOGY_CLASSIFICATION_QUERY_KEY);

  if (selectors.length === 0) {
    if (options?.explicitEmpty) {
      nextParams.set(TOPOLOGY_CLASSIFICATION_QUERY_KEY, "");
    }
  } else if (!hasDefaultSelectorSet(selectors)) {
    for (const selector of dedupeSelectors(selectors)) {
      nextParams.append(TOPOLOGY_CLASSIFICATION_QUERY_KEY, selector);
    }
  }

  const query = nextParams.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}
