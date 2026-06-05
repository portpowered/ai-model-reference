export const FOOTER_DIRECTIONAL_SUBLABELS = {
  previous: "Previous Page",
  next: "Next Page",
} as const;

export type FooterDirectionalSublabel =
  (typeof FOOTER_DIRECTIONAL_SUBLABELS)[keyof typeof FOOTER_DIRECTIONAL_SUBLABELS];

/** Extracts the Fumadocs main page region from built route HTML. */
export function extractNdPageHtml(html: string): string {
  const pageStart = html.indexOf('id="nd-page"');
  if (pageStart < 0) {
    return "";
  }

  const tocStart = html.indexOf('id="nd-toc"', pageStart);
  const searchEnd = tocStart > pageStart ? tocStart : html.length;
  return html.slice(pageStart, searchEnd);
}

/** Extracts the footer previous/next card anchor that contains the directional sublabel. */
export function extractFooterCardAnchorHtml(
  ndPageHtml: string,
  sublabel: FooterDirectionalSublabel,
): string {
  const marker = `>${sublabel}<`;
  const sublabelIndex = ndPageHtml.indexOf(marker);
  if (sublabelIndex < 0) {
    return "";
  }

  const anchorStart = ndPageHtml.lastIndexOf("<a ", sublabelIndex);
  const anchorEnd = ndPageHtml.indexOf("</a>", sublabelIndex);
  if (anchorStart < 0 || anchorEnd < 0) {
    return "";
  }

  return ndPageHtml.slice(anchorStart, anchorEnd + "</a>".length);
}

export function footerCardHasAccentHoverClasses(anchorHtml: string): boolean {
  return (
    anchorHtml.includes("hover:bg-fd-accent") &&
    anchorHtml.includes("hover:text-fd-accent-foreground")
  );
}

export function footerCardHasMutedDirectionalSublabel(
  anchorHtml: string,
  sublabel: FooterDirectionalSublabel,
): boolean {
  return (
    anchorHtml.includes('class="text-fd-muted-foreground truncate"') &&
    anchorHtml.includes(sublabel)
  );
}
