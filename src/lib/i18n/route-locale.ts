import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildLocalizedRoute,
  defaultLocale,
  type LocalizedRouteDestination,
  resolveLocale,
  type SiteLocale,
  supportedLocales,
  UnsupportedLocaleError,
} from "@/lib/i18n/locale-routing";

export function resolveRouteLocaleOrNotFound(locale?: string): SiteLocale {
  try {
    return resolveLocale(locale);
  } catch (error) {
    if (error instanceof UnsupportedLocaleError) {
      notFound();
    }
    throw error;
  }
}

export function localizedRouteAlternates(
  destination: LocalizedRouteDestination,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: buildLocalizedRoute(destination, defaultLocale),
    languages: Object.fromEntries(
      supportedLocales.map((locale) => [
        locale,
        buildLocalizedRoute(destination, locale),
      ]),
    ),
  };
}
