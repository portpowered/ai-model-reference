/** True when exported HTML references bundled assets under the configured base path. */
export function exportHtmlReferencesBasePathAssets(
  html: string,
  basePath: string,
): boolean {
  if (basePath === "") {
    return false;
  }

  return html.includes(`${basePath}/_next/`);
}

/** True when exported HTML includes at least one internal docs or tags href under basePath. */
export function exportHtmlReferencesBasePathInternalLinks(
  html: string,
  basePath: string,
): boolean {
  if (basePath === "") {
    return false;
  }

  const docsHref = `href="${basePath}/docs/`;
  const tagsHref = `href="${basePath}/tags`;
  const rootHref = `href="${basePath}"`;

  return (
    html.includes(docsHref) ||
    html.includes(tagsHref) ||
    html.includes(`${rootHref}/`)
  );
}
