import { expect } from "bun:test";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "@/lib/verify/home-search-entry-convergence";

/** Removed inline home search section heading — must not return in article body. */
export const REMOVED_HOME_INLINE_SEARCH_HEADING =
  REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE;

/**
 * Observable header-only search contract for `HomeArticle` markup:
 * no inline `/search` handoff, dialog trigger, or removed inline search section.
 */
export function expectHomeArticleHeaderOnlySearchEntry(html: string): void {
  expect(html).not.toContain('href="/search"');
  expect(html).not.toContain("data-search");
  expect(html).not.toContain(REMOVED_HOME_INLINE_SEARCH_HEADING);
}

/** @deprecated Use {@link expectHomeArticleHeaderOnlySearchEntry}. */
export const expectHomeArticleSingleSearchEntry =
  expectHomeArticleHeaderOnlySearchEntry;
