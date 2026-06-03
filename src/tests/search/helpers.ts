export const SAMPLE_MODULE_URL = "/docs/modules/grouped-query-attention";
export const TOKEN_GLOSSARY_URL = "/docs/glossary/token";

export function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) => result.url === pageUrl || result.url.startsWith(`${pageUrl}#`),
  );
}

export function resultsIncludeSampleModule(
  results: Array<{ url: string }>,
): boolean {
  return resultsIncludeUrl(results, SAMPLE_MODULE_URL);
}

export function resultsIncludeTokenGlossary(
  results: Array<{ url: string }>,
): boolean {
  return resultsIncludeUrl(results, TOKEN_GLOSSARY_URL);
}
