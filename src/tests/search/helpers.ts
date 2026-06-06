import { expect } from "bun:test";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";

export const SAMPLE_MODULE_URL = "/docs/modules/grouped-query-attention";
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

/** Asserts UI/API search rows list each page once without fragment hash URLs. */
export function expectUniqueCanonicalPageUrls(urls: readonly string[]): void {
  const bases = urls.map(pageBaseUrl);
  expect(new Set(bases).size).toBe(bases.length);
  expect(urls.every((url) => !url.includes("#"))).toBe(true);
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

type ThinMetadataQueries = {
  queryAllByTestId: (id: string) => HTMLElement[];
  queryByTestId: (id: string) => HTMLElement | null;
};

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
