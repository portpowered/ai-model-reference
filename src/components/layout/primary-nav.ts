import type { TopologyNavigationOption } from "@/lib/content/topology-navigation";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

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

type PrimaryNavOptions = {
  topologyOptions?: readonly TopologyNavigationOption[];
};

function formatTopologyNavLabel(
  messages: UiMessages,
  option: TopologyNavigationOption,
  destination: TopologyNavigationOption["destinations"][number],
): string {
  return messages.topologyBrowse.navigationLabelTemplate
    .replaceAll("{classification}", option.label)
    .replaceAll("{mode}", destination.label);
}

function getTopologyPrimaryNavItems(
  messages: UiMessages,
  topologyOptions: readonly TopologyNavigationOption[] = [],
): PrimaryNavItem[] {
  return topologyOptions.flatMap((option) =>
    option.destinations.map((destination) => ({
      href: destination.href,
      label: formatTopologyNavLabel(messages, option, destination),
    })),
  );
}

export function getPrimaryNavItems(
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
  options: PrimaryNavOptions = {},
): PrimaryNavItem[] {
  const topologyItems = getTopologyPrimaryNavItems(
    messages,
    options.topologyOptions,
  );

  return [
    {
      href: buildLocalizedRoute({ surface: "home" }, locale),
      label: messages.nav.home,
    },
    {
      href: buildLocalizedRoute({ surface: "architecture-index" }, locale),
      label: messages.nav.architecture,
    },
    ...topologyItems,
    {
      href: buildLocalizedRoute({ surface: "topology" }, locale),
      label: messages.nav.topology,
    },
    {
      href: buildLocalizedRoute({ surface: "glossary-index" }, locale),
      label: messages.nav.glossary,
    },
    {
      href: buildLocalizedRoute({ surface: "tags-index" }, locale),
      label: messages.nav.tags,
    },
  ];
}
