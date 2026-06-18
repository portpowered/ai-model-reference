"use client";

import type { ChangeEvent } from "react";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  localeOptions,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";

type LanguageSelectorProps = {
  messages: UiMessages;
  locale?: SiteLocale;
};

export function LanguageSelector({
  messages,
  locale = defaultLocale,
}: LanguageSelectorProps) {
  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.currentTarget.value as SiteLocale;

    if (nextLocale === locale || typeof window === "undefined") {
      return;
    }

    const activePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const fallbackPath = buildLocalizedRoute({ surface: "home" }, locale);
    window.location.assign(
      switchRouteLocale(activePath || fallbackPath, nextLocale),
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="hidden sm:inline">{messages.nav.language}</span>
      <span className="sr-only md:hidden">{messages.nav.language}</span>
      <select
        aria-label={messages.nav.language}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={onChange}
        value={locale}
      >
        {localeOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
            {option.code === locale ? ` (${messages.nav.currentLanguage})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
