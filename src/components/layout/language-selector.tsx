"use client";

import { usePathname } from "next/navigation";
import type { ChangeEvent } from "react";
import { useId } from "react";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  localeOptions,
  resolveLocalizedRouteSwitch,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

type LanguageSelectorProps = {
  messages: UiMessages;
  locale?: SiteLocale;
};

export function LanguageSelector({
  messages,
  locale = defaultLocale,
}: LanguageSelectorProps) {
  const pathname = usePathname();
  const unavailableHintId = useId();
  const routePath =
    pathname || buildLocalizedRoute({ surface: "home" }, locale);
  const options = localeOptions.map((option) => {
    if (option.code === locale) {
      return { ...option, available: true };
    }

    return {
      ...option,
      ...resolveLocalizedRouteSwitch(routePath, option.code),
    };
  });
  const unavailableOptions = options.filter((option) => !option.available);
  const unavailableSummary =
    unavailableOptions.length > 0
      ? `${messages.nav.unavailableOnPage}: ${unavailableOptions
          .map((option) => option.label)
          .join(", ")}`
      : null;

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.currentTarget.value as SiteLocale;

    if (nextLocale === locale || typeof window === "undefined") {
      return;
    }

    const activePath = `${routePath}${window.location.search}${window.location.hash}`;
    const fallbackPath = routePath;
    const resolved = resolveLocalizedRouteSwitch(
      activePath || fallbackPath,
      nextLocale,
    );

    if (!resolved.available) {
      return;
    }

    window.location.assign(resolved.href);
  }

  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className="hidden sm:inline">{messages.nav.language}</span>
        <span className="sr-only md:hidden">{messages.nav.language}</span>
      </span>
      <select
        aria-label={messages.nav.language}
        aria-describedby={unavailableSummary ? unavailableHintId : undefined}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={onChange}
        value={locale}
      >
        {options.map((option) => (
          <option
            key={option.code}
            disabled={!option.available}
            value={option.code}
          >
            {option.label}
            {option.code === locale
              ? ` (${messages.nav.currentLanguage})`
              : option.available
                ? ""
                : ` (${messages.nav.unavailableLanguage})`}
          </option>
        ))}
      </select>
      {unavailableSummary ? (
        <span
          id={unavailableHintId}
          className="text-xs text-muted-foreground"
          role="status"
        >
          {unavailableSummary}
        </span>
      ) : null}
    </label>
  );
}
