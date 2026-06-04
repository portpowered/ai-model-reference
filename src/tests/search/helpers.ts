export const SAMPLE_MODULE_URL = "/docs/modules/grouped-query-attention";
export const TOKEN_GLOSSARY_URL = "/docs/glossary/token";

export const TAXONOMY_GLOSSARY_URLS = [
  "/docs/glossary/model",
  "/docs/glossary/architecture",
  "/docs/glossary/module",
  "/docs/glossary/component",
  "/docs/glossary/modality",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generative-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/representation",
] as const;

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
