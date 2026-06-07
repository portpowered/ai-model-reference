/** SSR markers required for the GQA attention-variant comparison graph shell. */
export const GQA_ATTENTION_VARIANT_GRAPH_SHELL_MARKERS = [
  'data-attention-variant-comparison="true"',
  'data-react-flow-graph="true"',
  'data-attention-variant-option="mha"',
  'data-attention-variant-option="gqa"',
] as const;

/** True when exported GQA HTML includes the comparison graph shell markers. */
export function exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(
  html: string,
): boolean {
  return GQA_ATTENTION_VARIANT_GRAPH_SHELL_MARKERS.every((marker) =>
    html.includes(marker),
  );
}

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
