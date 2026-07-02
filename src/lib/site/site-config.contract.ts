import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { LocalizedRouteDestination } from "@/lib/i18n/locale-routing";

/** Named shell route surfaces referenced by navigation and home featured links. */
export const SITE_NAMED_ROUTE_SURFACES = [
  "home",
  "browse",
  "topology",
  "timeline",
  "tagsIndex",
] as const;

export type SiteNamedRouteSurface = (typeof SITE_NAMED_ROUTE_SURFACES)[number];

/** UI message keys for primary navigation labels under `messages.nav`. */
export type PrimaryNavLabelKey = Extract<
  keyof UiMessages["nav"],
  "home" | "topology" | "timeline" | "tags"
>;

/** Collection families represented in the site shell without binding renderers. */
export const SITE_COLLECTION_FAMILIES = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
] as const;

export type SiteCollectionFamily = (typeof SITE_COLLECTION_FAMILIES)[number];

export type SiteBrandConfig = {
  /** Stable scaffold identifier used by health checks and smoke tests. */
  scaffoldId: string;
  /** Brand label rendered on shared shell surfaces. */
  brandName: string;
  /** Primary home page heading. */
  siteHeading: string;
};

export type SiteRouteSurfaces = Record<
  SiteNamedRouteSurface,
  LocalizedRouteDestination
>;

export type SitePrimaryNavEntry = {
  routeSurface: SiteNamedRouteSurface;
  labelKey: PrimaryNavLabelKey;
};

export type SiteCollectionPlaceholder = {
  family: SiteCollectionFamily;
};

/** UI message keys for home featured link titles under `messages.home`. */
export type HomeFeaturedLinkTitleKey = Extract<
  keyof UiMessages["home"],
  "atlasLinkTitle" | "gqaLinkTitle" | "swigluLinkTitle" | "reluLinkTitle"
>;

/** UI message keys for home featured link descriptions under `messages.home`. */
export type HomeFeaturedLinkDescriptionKey = Extract<
  keyof UiMessages["home"],
  | "atlasLinkDescription"
  | "gqaLinkDescription"
  | "swigluLinkDescription"
  | "reluLinkDescription"
>;

type HomeFeaturedLinkCopyBinding = {
  titleKey: HomeFeaturedLinkTitleKey;
  descriptionKey: HomeFeaturedLinkDescriptionKey;
};

export type HomeFeaturedLinkPlaceholder =
  | ({
      kind: "route";
      routeSurface: Extract<SiteNamedRouteSurface, "browse">;
    } & HomeFeaturedLinkCopyBinding)
  | ({ kind: "docs-page"; slug: string } & HomeFeaturedLinkCopyBinding);

export type SiteConfig = {
  brand: SiteBrandConfig;
  repositoryUrl: string;
  routeSurfaces: SiteRouteSurfaces;
  primaryNav: readonly SitePrimaryNavEntry[];
  collections: readonly SiteCollectionPlaceholder[];
  homeFeaturedLinks: readonly HomeFeaturedLinkPlaceholder[];
};
