import type { SiteLocale } from "@/lib/i18n/locale-routing";
import { resolveRouteLocaleOrNotFound } from "@/lib/i18n/route-locale";

type LocalizedMetadataParams = Promise<{ locale: string }>;

export async function resolveMetadataLocale(
  params: LocalizedMetadataParams,
): Promise<SiteLocale> {
  const { locale: rawLocale } = await params;
  return resolveRouteLocaleOrNotFound(rawLocale);
}
