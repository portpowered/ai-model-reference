import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

/** Canonical docs URL for a glossary entry slug. */
export function glossaryPageHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute(
    { surface: "docs-page", slug: `glossary/${slug}` },
    locale,
  );
}

/** Canonical docs URL for a concept entry slug under `docs/concepts`. */
export function conceptPageHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute(
    { surface: "docs-page", slug: `concepts/${slug}` },
    locale,
  );
}

/** Canonical docs URL for a module entry slug. */
export function modulePageHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute(
    { surface: "docs-page", slug: `modules/${slug}` },
    locale,
  );
}

/** Canonical docs URL for a model entry slug. */
export function modelPageHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute(
    { surface: "docs-page", slug: `models/${slug}` },
    locale,
  );
}

/** Canonical docs URL for a paper entry slug. */
export function paperPageHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute(
    { surface: "docs-page", slug: `papers/${slug}` },
    locale,
  );
}

/** Canonical docs URL for a training-regime entry slug. */
export function trainingPageHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute(
    { surface: "docs-page", slug: `training/${slug}` },
    locale,
  );
}

/** Canonical tag landing URL for a registry tag slug. */
export function tagPageHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute({ surface: "tag-page", slug }, locale);
}
