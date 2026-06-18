import { expect } from "bun:test";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import {
  assertSearchNoMatchedTags,
  assertSearchPageLevelHits,
  type SearchSurfaceResultSnapshot,
} from "@/lib/verify/customer-ask-search-surface-convergence";

export const SAMPLE_MODULE_URL = "/docs/modules/grouped-query-attention";
export const MULTI_HEAD_ATTENTION_URL = "/docs/modules/multi-head-attention";
export const MULTI_QUERY_ATTENTION_URL = "/docs/modules/multi-query-attention";
export const TOKEN_GLOSSARY_URL = "/docs/glossary/token";

export const TAXONOMY_GLOSSARY_URLS = [
  "/docs/glossary/model",
  "/docs/glossary/architecture",
  "/docs/glossary/module",
  "/docs/glossary/component",
  "/docs/glossary/modality",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generative-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/representation",
] as const;

export const REPRESENTATION_LATENT_GLOSSARY_URLS = [
  "/docs/glossary/patch",
  "/docs/glossary/latent",
  "/docs/glossary/latent-space",
] as const;

export function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) => result.url === pageUrl || result.url.startsWith(`${pageUrl}#`),
  );
}

export function resultsIncludeSampleModule(
  results: Array<{ url: string }>,
): boolean {
  return resultsIncludeUrl(results, SAMPLE_MODULE_URL);
}

export function resultsIncludeMultiHeadAttention(
  results: Array<{ url: string }>,
): boolean {
  return resultsIncludeUrl(results, MULTI_HEAD_ATTENTION_URL);
}

export function resultsIncludeMultiQueryAttention(
  results: Array<{ url: string }>,
): boolean {
  return resultsIncludeUrl(results, MULTI_QUERY_ATTENTION_URL);
}

/** Asserts UI/API search rows list each page once without fragment hash URLs. */
export function expectUniqueCanonicalPageUrls(urls: readonly string[]): void {
  const bases = urls.map(pageBaseUrl);
  expect(new Set(bases).size).toBe(bases.length);
  expect(urls.every((url) => !url.includes("#"))).toBe(true);
}

export function countFragmentSpamSignals(urls: readonly string[]): {
  fragmentCount: number;
  duplicateBaseCount: number;
} {
  const bases = urls.map(pageBaseUrl);
  return {
    fragmentCount: urls.filter((url) => url.includes("#")).length,
    duplicateBaseCount: bases.length - new Set(bases).size,
  };
}

/**
 * Asserts collapsed search results are page-level while raw Orama hits still
 * carry fragment or duplicate-page spam that collapse removes.
 */
export function expectCollapsedResultsDominateFragmentSpam(
  rawUrls: readonly string[],
  collapsedUrls: readonly string[],
): void {
  expect(collapsedUrls.length).toBeGreaterThan(0);
  expectUniqueCanonicalPageUrls(collapsedUrls);

  const rawSpam = countFragmentSpamSignals(rawUrls);
  const collapsedUniquePages = new Set(collapsedUrls.map(pageBaseUrl)).size;
  const rawWouldSpam =
    rawSpam.fragmentCount > 0 ||
    rawSpam.duplicateBaseCount > 0 ||
    rawUrls.length > collapsedUniquePages;

  expect(rawWouldSpam).toBe(true);
  expect(collapsedUrls.length).toBeLessThanOrEqual(collapsedUniquePages);
}

export function collectResultUrlsFromNodes(
  nodes: Array<{
    textContent: string | null;
    querySelector: (selector: string) => Element | null;
  }>,
): string[] {
  return nodes
    .map((node) => {
      const path = node
        .querySelector('[aria-hidden="true"]')
        ?.textContent?.trim();
      if (path) {
        return path;
      }
      return node.textContent?.trim() ?? "";
    })
    .filter((text) => text.length > 0);
}

export function resultsIncludeTokenGlossary(
  results: Array<{ url: string }>,
): boolean {
  return resultsIncludeUrl(results, TOKEN_GLOSSARY_URL);
}

export async function retrySearchResults<T>(
  runSearch: () => T[] | PromiseLike<T[]>,
  accept: (results: T[]) => boolean,
  options: { maxAttempts?: number; delayMs?: number } = {},
): Promise<T[]> {
  const maxAttempts = options.maxAttempts ?? 2;
  const delayMs = options.delayMs ?? 50;

  let lastResults: T[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResults = await runSearch();
    if (accept(lastResults) || attempt === maxAttempts) {
      return lastResults;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return lastResults;
}

type ThinMetadataQueries = {
  queryAllByTestId: (id: string) => HTMLElement[];
  queryByTestId: (id: string) => HTMLElement | null;
};

/** Builds a customer-ask search-surface snapshot from rendered panel results. */
export function buildSearchSurfaceSnapshotFromPanel(
  queries: ThinMetadataQueries,
): SearchSurfaceResultSnapshot {
  const resultUrls = collectResultUrlsFromNodes(
    queries.queryAllByTestId("search-result-url"),
  );
  const matchedTagsVisible =
    queries.queryByTestId("search-result-matched-tags") !== null;
  const hasEmpty =
    queries.queryByTestId("search-dialog-empty") !== null ||
    queries.queryByTestId("search-page-empty") !== null;

  return {
    resultUrls,
    matchedTagsVisible,
    hasResults: resultUrls.length > 0,
    hasEmpty,
  };
}

/** Asserts `/search` panel snapshots satisfy customer-ask page-level hit checks. */
export function expectCustomerAskSearchPagePanel(
  queries: ThinMetadataQueries,
  query: string,
): void {
  const snapshot = buildSearchSurfaceSnapshotFromPanel(queries);
  expect(assertSearchPageLevelHits(snapshot, query)).toBeNull();
  expect(assertSearchNoMatchedTags(snapshot)).toBeNull();
}

/** Asserts header dialog snapshots satisfy customer-ask matched-tag checks. */
export function expectCustomerAskSearchDialogPanel(
  queries: ThinMetadataQueries,
): void {
  const snapshot = buildSearchSurfaceSnapshotFromPanel(queries);
  expect(assertSearchNoMatchedTags(snapshot)).toBeNull();
}

/** Asserts page hits render through the shared SearchResultRow with embedded metadata. */
export function expectSharedSearchResultRowPanel(
  queries: ThinMetadataQueries,
): void {
  const rows = queries.queryAllByTestId("search-result-row");
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    const meta = row.querySelector('[data-testid="search-result-meta"]');
    if (!meta) {
      expect(meta).toBeTruthy();
      continue;
    }
    expect(row.contains(meta)).toBe(true);
    expect(
      row.querySelector('[data-testid="search-result-matched-tags"]'),
    ).toBeNull();
  }
}

/** Asserts page hits use full-row hover/focus/selection classes with embedded metadata. */
export function expectFullRowSearchResultHighlightPanel(
  queries: ThinMetadataQueries,
): void {
  const rows = queries.queryAllByTestId("search-result-row");
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.className).toContain("group");
    const meta = row.querySelector('[data-testid="search-result-meta"]');
    if (!meta) {
      expect(meta).toBeTruthy();
      continue;
    }
    expect(row.contains(meta)).toBe(true);
    expect(meta.className).toContain("group-hover:text-accent-foreground");
    expect(meta.className).toContain(
      "group-focus-visible:text-accent-foreground",
    );
    expect(meta.className).toContain(
      "group-aria-selected:text-fd-accent-foreground",
    );
    const fields = meta.querySelectorAll(
      '[data-testid="search-result-summary"], [data-testid="search-result-url"], [data-testid="search-result-kind"]',
    );
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(field.className).toContain("text-inherit");
    }
  }
}

/** Asserts query-match marks stay inside rows with accent-safe hover/focus/selection classes. */
export function expectReadableQueryMatchHighlightPanel(
  queries: ThinMetadataQueries,
): void {
  const rows = queries.queryAllByTestId("search-result-row");
  expect(rows.length).toBeGreaterThan(0);

  let markCount = 0;
  for (const row of rows) {
    const marks = row.querySelectorAll(
      '[data-testid="search-result-title-mark"]',
    );
    for (const mark of marks) {
      markCount += 1;
      expect(row.contains(mark)).toBe(true);
      expect(mark.className).toContain("group-hover:text-accent-foreground");
      expect(mark.className).toContain(
        "group-focus-visible:text-accent-foreground",
      );
      expect(mark.className).toContain(
        "group-aria-selected:text-fd-accent-foreground",
      );

      const title = mark.closest('[class*="font-medium"]');
      expect(title).toBeTruthy();
      if (!title) {
        continue;
      }
      expect(title.className).toContain("group-hover:text-inherit");
      expect(title.className).toContain("group-focus-visible:text-inherit");
      expect(title.className).toContain("group-aria-selected:text-inherit");
    }
  }

  expect(markCount).toBeGreaterThan(0);
}

/** Asserts dialog or `/search` panels render thin metadata without matched-tag chips. */
export function expectThinSearchMetadataPanel(
  queries: ThinMetadataQueries,
  options?: { expectSummary?: boolean },
): void {
  expect(queries.queryByTestId("search-result-matched-tags")).toBeNull();
  const metaPanels = queries.queryAllByTestId("search-result-meta");
  expect(metaPanels.length).toBeGreaterThan(0);
  for (const panel of metaPanels) {
    expect(
      panel.querySelector('[data-testid="search-result-url"]'),
    ).toBeTruthy();
    expect(
      panel.querySelector('[data-testid="search-result-kind"]'),
    ).toBeTruthy();
    expect(
      panel.querySelector('[data-testid="search-result-matched-tags"]'),
    ).toBeNull();
    if (options?.expectSummary) {
      expect(
        panel.querySelector('[data-testid="search-result-summary"]'),
      ).toBeTruthy();
    }
  }
}
