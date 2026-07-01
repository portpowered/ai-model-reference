import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
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

export type ResolvedHomeFeaturedLink = {
  href: string;
  title: string;
  description: string;
};

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

export function resolveSiteConfigHomeFeaturedLinks(
  config: SiteConfig,
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
): ResolvedHomeFeaturedLink[] {
  return config.homeFeaturedLinks.map((link) => ({
    href: resolveHomeFeaturedLinkHref(config, link, locale),
    title: messages.home[link.titleKey],
    description: messages.home[link.descriptionKey],
  }));
}
