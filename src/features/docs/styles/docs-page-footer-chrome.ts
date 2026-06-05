/**
 * Selector contract for Fumadocs DocsPage previous/next footer cards.
 * Keep in sync with docs-page-footer-chrome.css.
 */
export const docsPageFooterCardSelector =
  '#nd-page a[class*="hover:bg-fd-accent"][class*="hover:text-fd-accent-foreground"]';

export const docsPageFooterSublabelInheritSelector = `${docsPageFooterCardSelector}:is(:hover, :focus-visible) > p.text-fd-muted-foreground`;
