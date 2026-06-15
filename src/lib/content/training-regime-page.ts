import type { LoadedTrainingRegimePage } from "./training-regime-page-load";

export type { LoadedTrainingRegimePage } from "./training-regime-page-load";

/** Loads a training-regime MDX page via a dynamic import boundary. */
export async function loadTrainingRegimePage(
  slug: string,
  locale = "en",
): Promise<LoadedTrainingRegimePage> {
  const { loadTrainingRegimePageFromDisk } = await import(
    "./training-regime-page-load"
  );
  return loadTrainingRegimePageFromDisk(slug, locale);
}
