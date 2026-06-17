import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import type { LoadedPaperPage } from "./paper-page-load";

export type { LoadedPaperPage } from "./paper-page-load";

/** Loads a paper MDX page via a dynamic import boundary. */
export async function loadPaperPage(
  slug: string,
  locale: SiteLocale = defaultLocale,
): Promise<LoadedPaperPage> {
  const { loadPaperPageFromDisk } = await import("./paper-page-load");
  return loadPaperPageFromDisk(slug, locale);
}
