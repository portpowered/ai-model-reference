import type { LocalizedRouteDestination } from "@/lib/i18n/locale-routing";

export type SiteRouteSurfaceId = string;
export type SiteCollectionId = string;

export type SiteBrandConfig = {
  /** Stable scaffold identifier used by health checks and smoke tests. */
  scaffoldId: string;
  /** Brand label rendered on shared shell surfaces. */
  brandName: string;
  /** Primary home page heading. */
  siteHeading: string;
};

export type SiteRouteSurfaces = Record<
  SiteRouteSurfaceId,
  LocalizedRouteDestination
>;

export type SitePrimaryNavEntry = {
  routeSurface: SiteRouteSurfaceId;
  labelKey: string;
};

export type SiteCollectionPlaceholder = {
  id: SiteCollectionId;
};

export type HomeFeaturedLinkMessageCopy = {
  titleKey: string;
  descriptionKey: string;
  title?: never;
  description?: never;
};

export type HomeFeaturedLinkResolvedCopy = {
  title: string;
  description: string;
  titleKey?: never;
  descriptionKey?: never;
};

export type HomeFeaturedLinkCopy =
  | HomeFeaturedLinkMessageCopy
  | HomeFeaturedLinkResolvedCopy;

export type HomeFeaturedLinkPlaceholder =
  | ({ kind: "route"; routeSurface: SiteRouteSurfaceId } & HomeFeaturedLinkCopy)
  | ({ kind: "docs-page"; slug: string } & HomeFeaturedLinkCopy);

export type SiteConfig = {
  brand: SiteBrandConfig;
  repositoryUrl: string;
  routeSurfaces: SiteRouteSurfaces;
  /** Route surface id used by layout nav title links. */
  homeRouteSurface: SiteRouteSurfaceId;
  primaryNav: readonly SitePrimaryNavEntry[];
  collections: readonly SiteCollectionPlaceholder[];
  homeFeaturedLinks: readonly HomeFeaturedLinkPlaceholder[];
};

export function isHomeFeaturedLinkMessageCopy(
  copy: HomeFeaturedLinkCopy,
): copy is HomeFeaturedLinkMessageCopy {
  return "titleKey" in copy;
}
