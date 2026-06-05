import { expect } from "bun:test";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "@/lib/verify/home-search-entry-convergence";

/** Removed inline home search section heading — must not return in article body. */
export const REMOVED_HOME_INLINE_SEARCH_HEADING =
  REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE;

/**
 * Observable single-entry contract for `HomeArticle` markup:
 * bookmark `/search` link present; no duplicate dialog trigger or removed section.
 */
export function expectHomeArticleSingleSearchEntry(html: string): void {
  expect(html).toContain('href="/search"');
  expect(html).not.toContain("data-search");
  expect(html).not.toContain(REMOVED_HOME_INLINE_SEARCH_HEADING);
}
