import type { LoadedGlossaryPage } from "./glossary-page-load";

export type { LoadedGlossaryPage } from "./glossary-page-load";

/** Loads a published glossary MDX page via a dynamic import boundary. */
export async function loadGlossaryPage(
  slug: string,
  locale = "en",
): Promise<LoadedGlossaryPage> {
  const { loadGlossaryPageFromDisk } = await import("./glossary-page-load");
  return loadGlossaryPageFromDisk(slug, locale);
}
