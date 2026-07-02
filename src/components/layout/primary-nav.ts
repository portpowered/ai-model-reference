import type { TopologyNavigationOption } from "@/lib/content/topology-navigation";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type LocalizedRouteDestination,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { modelAtlasSiteConfig } from "@/lib/site/model-atlas-site-config";
import type { SiteConfig } from "@/lib/site/site-config.contract";

export const PRIMARY_NAV_LINK_CLASS =
  "text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const PRIMARY_NAV_DESKTOP_CLASS = "hidden md:flex";

export const PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS = "md:hidden";

export const PRIMARY_NAV_MOBILE_PANEL_CLASS =
  "order-last w-full basis-full border-t border-border py-3 md:hidden";

export const PRIMARY_NAV_MOBILE_LINK_CLASS =
  "flex min-w-0 rounded-lg border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type PrimaryNavItem = {
  href: string;
  label: string;
};

export type GetPrimaryNavItemsOptions = {
  topologyOptions?: readonly TopologyNavigationOption[];
  siteConfig?: SiteConfig;
};

export function getPrimaryNavItems(
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
  options: GetPrimaryNavItemsOptions = {},
): PrimaryNavItem[] {
  const { siteConfig = modelAtlasSiteConfig } = options;

  const routeSurfaces = siteConfig.routeSurfaces as Record<
    string,
    LocalizedRouteDestination
  >;

  return siteConfig.primaryNav.map((entry) => ({
    href: buildLocalizedRoute(routeSurfaces[entry.routeSurface], locale),
    label: (messages.nav as Record<string, string>)[entry.labelKey],
  }));
}
