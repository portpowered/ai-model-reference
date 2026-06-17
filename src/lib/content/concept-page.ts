import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import type { LoadedConceptPage } from "./concept-page-load";

export type { LoadedConceptPage } from "./concept-page-load";

/** Loads a concept MDX page via a dynamic import boundary. */
export async function loadConceptPage(
  slug: string,
  locale: SiteLocale = defaultLocale,
): Promise<LoadedConceptPage> {
  const { loadConceptPageFromDisk } = await import("./concept-page-load");
  return loadConceptPageFromDisk(slug, locale);
}
