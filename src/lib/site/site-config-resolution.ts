import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import type {
  HomeFeaturedLinkCopy,
  HomeFeaturedLinkPlaceholder,
  SiteConfig,
  SitePrimaryNavEntry,
} from "./site-config.contract";
import { isHomeFeaturedLinkMessageCopy } from "./site-config.contract";

export function resolveSiteConfigLayoutNav(
  config: SiteConfig,
  locale: SiteLocale = defaultLocale,
): { title: string; url: string } {
  return {
    title: config.brand.brandName,
    url: buildLocalizedRoute(
      config.routeSurfaces[config.homeRouteSurface],
      locale,
    ),
  };
}

export function resolveSiteConfigRepositoryUrl(config: SiteConfig): string {
  return config.repositoryUrl;
}

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

function resolveHomeFeaturedLinkCopy(
  copy: HomeFeaturedLinkCopy,
  messages: UiMessages,
): Pick<ResolvedHomeFeaturedLink, "title" | "description"> {
  if (isHomeFeaturedLinkMessageCopy(copy)) {
    const homeMessages = messages.home as Record<string, string>;

    return {
      title: homeMessages[copy.titleKey],
      description: homeMessages[copy.descriptionKey],
    };
  }

  return {
    title: copy.title,
    description: copy.description,
  };
}

export function resolveSiteConfigHomeFeaturedLinks(
  config: SiteConfig,
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
): ResolvedHomeFeaturedLink[] {
  return config.homeFeaturedLinks.map((link) => ({
    href: resolveHomeFeaturedLinkHref(config, link, locale),
    ...resolveHomeFeaturedLinkCopy(link, messages),
  }));
}
