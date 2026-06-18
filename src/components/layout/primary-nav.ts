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

export type PrimaryNavItem = {
  href: string;
  label: string;
};

export function getPrimaryNavItems(
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
): PrimaryNavItem[] {
  return [
    {
      href: buildLocalizedRoute({ surface: "home" }, locale),
      label: messages.nav.home,
    },
    {
      href: buildLocalizedRoute({ surface: "architecture-index" }, locale),
      label: messages.nav.architecture,
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
