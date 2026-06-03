export const SAMPLE_MODULE_URL = "/docs/modules/grouped-query-attention";

export function resultsIncludeSampleModule(
  results: Array<{ url: string }>,
): boolean {
  return results.some(
    (result) =>
      result.url === SAMPLE_MODULE_URL ||
      result.url.startsWith(`${SAMPLE_MODULE_URL}#`),
  );
}
