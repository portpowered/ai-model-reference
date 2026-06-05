/** Extracts the Fumadocs right-rail TOC markup from built page HTML. */
export function extractNdTocHtml(html: string): string {
  const tocStart = html.indexOf('id="nd-toc"');
  if (tocStart < 0) {
    return "";
  }

  const pageEnd = html.indexOf('id="nd-page"', tocStart);
  const searchEnd = pageEnd > tocStart ? pageEnd : html.length;
  return html.slice(tocStart, searchEnd);
}

export function tocHtmlIncludesAnchor(
  tocHtml: string,
  anchorId: string,
): boolean {
  return (
    tocHtml.includes(`href="#${anchorId}"`) ||
    tocHtml.includes(`href='${anchorId}'`)
  );
}
