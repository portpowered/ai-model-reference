import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import type {
  HomeFeaturedLinkPlaceholder,
  SiteConfig,
  SitePrimaryNavEntry,
} from "./site-config.contract";

export function resolveSiteConfigLayoutNav(
  config: SiteConfig,
  locale: SiteLocale = defaultLocale,
): { title: string; url: string } {
  return {
    title: config.brand.brandName,
    url: buildLocalizedRoute(config.routeSurfaces.home, locale),
  };
}

export function resolveSiteConfigRepositoryUrl(config: SiteConfig): string {
  return config.repositoryUrl;
}

function resolveRouteSurfaceHref(
  config: SiteConfig,
  routeSurface: SitePrimaryNavEntry["routeSurface"],
  locale: SiteLocale,
): string {
  return buildLocalizedRoute(config.routeSurfaces[routeSurface], locale);
}

export function resolveSiteConfigPrimaryNavHrefs(
  config: SiteConfig,
  locale: SiteLocale = defaultLocale,
): string[] {
  return config.primaryNav.map((entry) =>
    resolveRouteSurfaceHref(config, entry.routeSurface, locale),
  );
}

function resolveHomeFeaturedLinkHref(
  config: SiteConfig,
  link: HomeFeaturedLinkPlaceholder,
  locale: SiteLocale,
): string {
  if (link.kind === "route") {
    return buildLocalizedRoute(config.routeSurfaces[link.routeSurface], locale);
  }

  const hrefLocale = isDocsPageShippedForLocale(link.slug, locale)
    ? locale
    : defaultLocale;

  return buildLocalizedRoute(
    { surface: "docs-page", slug: link.slug },
    hrefLocale,
  );
}

export function resolveSiteConfigHomeFeaturedLinkHrefs(
  config: SiteConfig,
  locale: SiteLocale = defaultLocale,
): string[] {
  return config.homeFeaturedLinks.map((link) =>
    resolveHomeFeaturedLinkHref(config, link, locale),
  );
}
