/**
 * Shared Tailwind classes for non-prose bulletless list surfaces and card-style
 * resource links used across home browse, docs index, tags index, and tag resources.
 */

/** Removes list markers without imposing flex column layout (e.g. divide-y stacks). */
export const bulletlessListMarkersClassName = "list-none";

/** Base flex column list without markers. Pair with a margin-top utility. */
export const bulletlessListBaseClassName = `flex ${bulletlessListMarkersClassName} flex-col gap-3`;

export type BulletlessListMargin = "mt-3" | "mt-4" | "mt-8";

export function bulletlessListClassName(
  marginTop: BulletlessListMargin = "mt-3",
): string {
  return `${marginTop} ${bulletlessListBaseClassName}`;
}

/**
 * Card-style resource link used on browse and index surfaces.
 * Explicit no-underline utilities override Fumadocs prose/link defaults inside DocsBody.
 */
export const docsResourceCardLinkClassName =
  "group block rounded-lg border border-border bg-card/40 p-4 no-underline transition-colors hover:border-ring hover:bg-card hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Bulletless /search inline results list with bordered row dividers. */
export const searchInlineResultsListClassName = `${bulletlessListMarkersClassName} divide-y divide-border rounded-lg border border-border`;
