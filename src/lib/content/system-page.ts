import type { SiteLocale } from "@/lib/i18n/locale-routing";
import type { LoadedSystemPage } from "./system-page-load";

export type { LoadedSystemPage } from "./system-page-load";

/** Loads a system MDX page via a dynamic import boundary. */
export async function loadSystemPage(
  slug: string,
  locale?: SiteLocale,
): Promise<LoadedSystemPage> {
  const { loadSystemPageFromDisk } = await import("./system-page-load");
  return loadSystemPageFromDisk(slug, locale);
}
