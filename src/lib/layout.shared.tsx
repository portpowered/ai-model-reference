import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { modelAtlasSiteConfig } from "@/lib/site/model-atlas-site-config";
import type { SiteConfig } from "@/lib/site/site-config.contract";
import { resolveSiteConfigLayoutNav } from "@/lib/site/site-config-resolution";

export function baseOptions(
  locale: SiteLocale = defaultLocale,
  siteConfig: SiteConfig = modelAtlasSiteConfig,
): BaseLayoutProps {
  return {
    nav: resolveSiteConfigLayoutNav(siteConfig, locale),
    searchToggle: {
      enabled: false,
    },
  };
}
