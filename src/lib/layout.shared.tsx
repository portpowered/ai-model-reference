import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { SITE_BRAND_NAME } from "@/lib/scaffold";

export function baseOptions(
  locale: SiteLocale = defaultLocale,
): BaseLayoutProps {
  return {
    nav: {
      title: SITE_BRAND_NAME,
      url: buildLocalizedRoute({ surface: "home" }, locale),
    },
    searchToggle: {
      enabled: false,
    },
  };
}
