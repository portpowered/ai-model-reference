import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import {
  defaultLocale,
  matchLocalizedRoute,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";

export function isLocalizedDocsHrefVisible(
  href: string,
  locale: SiteLocale,
): boolean {
  if (locale === defaultLocale) {
    return true;
  }

  const match = matchLocalizedRoute(href);
  if (match.kind !== "matched") {
    return true;
  }

  if (match.destination.surface !== "docs-page") {
    return true;
  }

  return isShippedLocalizedDocsSlug(match.destination.slug, locale);
}

export function localizeDocsHref(href: string, locale: SiteLocale): string {
  if (locale === defaultLocale) {
    return href;
  }

  const match = matchLocalizedRoute(href);
  if (match.kind !== "matched") {
    return href;
  }

  if (
    match.destination.surface === "docs-page" &&
    !isShippedLocalizedDocsSlug(match.destination.slug, locale)
  ) {
    return href;
  }

  return switchRouteLocale(href, locale);
}
