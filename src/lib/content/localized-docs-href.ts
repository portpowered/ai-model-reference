import {
  defaultLocale,
  resolveLocalizedRouteSwitch,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

export function localizeDocsHref(href: string, locale: SiteLocale): string {
  if (locale === defaultLocale) {
    return href;
  }

  const resolved = resolveLocalizedRouteSwitch(href, locale);
  if (!resolved.available) {
    return href;
  }

  return resolved.href;
}
