import type { LoadedPaperPage } from "./paper-page-load";

export type { LoadedPaperPage } from "./paper-page-load";

/** Loads a paper MDX page via a dynamic import boundary. */
export async function loadPaperPage(
  slug: string,
  locale = "en",
): Promise<LoadedPaperPage> {
  const { loadPaperPageFromDisk } = await import("./paper-page-load");
  return loadPaperPageFromDisk(slug, locale);
}
