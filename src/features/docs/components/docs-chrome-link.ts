/**
 * Shared Tailwind classes for non-prose docs navigation chrome (tag pills, related docs).
 * Explicit no-underline utilities override Fumadocs prose/link defaults inside DocsBody.
 */
export const docsChromeLinkClassName =
  "no-underline transition-colors hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const docsChromePillLinkClassName =
  "inline-flex max-w-full items-center break-words rounded-md border border-border bg-secondary px-2.5 py-1 text-sm text-secondary-foreground no-underline transition-colors hover:bg-muted hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
