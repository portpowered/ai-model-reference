import type { LoadedConceptPage } from "./concept-page-load";

export type { LoadedConceptPage } from "./concept-page-load";

/** Loads a concept MDX page via a dynamic import boundary. */
export async function loadConceptPage(
  slug: string,
  locale = "en",
): Promise<LoadedConceptPage> {
  const { loadConceptPageFromDisk } = await import("./concept-page-load");
  return loadConceptPageFromDisk(slug, locale);
}
