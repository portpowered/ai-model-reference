"use client";

import { useEffect } from "react";
import type { SiteLocale } from "@/lib/i18n/locale-routing";

type RouteLocaleEffectProps = {
  locale: SiteLocale;
};

export function RouteLocaleEffect({ locale }: RouteLocaleEffectProps) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
