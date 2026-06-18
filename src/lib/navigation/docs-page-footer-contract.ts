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

/** Minified bundled CSS drops whitespace and attribute-selector quotes. */
export function normalizeBundledCss(css: string): string {
  return css.replaceAll(/\s+/g, "");
}

/**
 * Production Tailwind bundles the footer sublabel inherit rule as a single
 * #nd-page selector chain with escaped hover utility class names.
 */
export function bundledCssHasFooterSublabelInheritRule(css: string): boolean {
  const normalized = normalizeBundledCss(css);

  return (
    normalized.includes("#nd-page") &&
    normalized.includes("a[class*=hover\\:bg-fd-accent]") &&
    normalized.includes("[class*=hover\\:text-fd-accent-foreground]") &&
    normalized.includes(":is(:hover,:focus-visible)") &&
    (normalized.includes(">p.text-fd-muted-foreground{color:inherit}") ||
      normalized.includes(">p.text-fd-muted-foreground{color:currentcolor}"))
  );
}

/**
 * Returns a failure reason when bundled app CSS lacks the footer sublabel
 * hover/focus inherit rule enforced by built HTML/CSS convergence checks.
 */
export function assertDocsFooterSublabelHoverFocusCssConvergence(
  css: string,
): string | null {
  if (bundledCssHasFooterSublabelInheritRule(css)) {
    return null;
  }

  return "bundled app CSS missing footer sublabel hover/focus inherit rule pairing";
}

/**
 * Returns a failure reason when built HTML footer cards inside #nd-page do not
 * match the accent-hover anchor and muted directional sublabel contract.
 */
export function assertFooterChromeContract(html: string): string | null {
  const ndPageHtml = extractNdPageHtml(html);
  if (ndPageHtml.length === 0) {
    return "footer #nd-page region missing from built HTML";
  }

  for (const sublabel of Object.values(FOOTER_DIRECTIONAL_SUBLABELS)) {
    const footerCard = extractFooterCardAnchorHtml(ndPageHtml, sublabel);

    if (footerCard.length === 0) {
      return `footer ${sublabel} card missing from #nd-page`;
    }

    if (!footerCardHasAccentHoverClasses(footerCard)) {
      return `footer ${sublabel} card missing accent-hover utility classes`;
    }

    if (!footerCardHasMutedDirectionalSublabel(footerCard, sublabel)) {
      return `footer ${sublabel} card missing muted directional sublabel`;
    }
  }

  return null;
}
