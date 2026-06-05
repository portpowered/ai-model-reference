import type { UiMessages } from "@/lib/content/ui-messages.types";

export const PRIMARY_NAV_LINK_CLASS =
  "text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type PrimaryNavItem = {
  href: string;
  label: string;
};

export function getPrimaryNavItems(messages: UiMessages): PrimaryNavItem[] {
  return [
    { href: "/", label: messages.nav.home },
    { href: "/docs/architecture", label: messages.nav.architecture },
    { href: "/docs/glossary", label: messages.nav.glossary },
    { href: "/tags", label: messages.nav.tags },
  ];
}
