import { expect } from "bun:test";

/** Removed inline home search section heading — must not return in article body. */
export const REMOVED_HOME_INLINE_SEARCH_HEADING = "Search the reference";

/**
 * Observable single-entry contract for `HomeArticle` markup:
 * bookmark `/search` link present; no duplicate dialog trigger or removed section.
 */
export function expectHomeArticleSingleSearchEntry(html: string): void {
  expect(html).toContain('href="/search"');
  expect(html).not.toContain("data-search");
  expect(html).not.toContain(REMOVED_HOME_INLINE_SEARCH_HEADING);
}
