import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import type { LoadedTrainingRegimePage } from "./training-regime-page-load";

export type { LoadedTrainingRegimePage } from "./training-regime-page-load";

/** Loads a training-regime MDX page via a dynamic import boundary. */
export async function loadTrainingRegimePage(
  slug: string,
  locale: SiteLocale = defaultLocale,
): Promise<LoadedTrainingRegimePage> {
  const { loadTrainingRegimePageFromDisk } = await import(
    "./training-regime-page-load"
  );
  return loadTrainingRegimePageFromDisk(slug, locale);
}
