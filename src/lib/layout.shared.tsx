import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

export function baseOptions(
  locale: SiteLocale = defaultLocale,
): BaseLayoutProps {
  return {
    nav: {
      title: "Model Reference",
      url: buildLocalizedRoute({ surface: "home" }, locale),
    },
    searchToggle: {
      enabled: false,
    },
  };
}
