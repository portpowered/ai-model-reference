"use client";

import { Check, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  defaultLocale,
  matchLocalizedRoute,
  supportedLocales,
  switchRouteLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

type LanguageSwitcherProps = {
  locale: SiteLocale;
  messages: UiMessages;
};

type LocaleOption = {
  locale: SiteLocale;
  href: string | null;
  label: string;
  available: boolean;
};

function buildRouteWithSearch(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const query = searchParams.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

function buildLocaleOption(
  pathname: string,
  locale: SiteLocale,
  searchParams: URLSearchParams,
  messages: UiMessages,
): LocaleOption {
  const currentRoute = buildRouteWithSearch(pathname, searchParams);
  const match = matchLocalizedRoute(currentRoute);
  const label = messages.language.locales[locale] ?? locale.toUpperCase();

  if (
    match.kind === "matched" &&
    match.destination.surface === "docs-page" &&
    locale !== defaultLocale &&
    !isShippedLocalizedDocsSlug(match.destination.slug, locale)
  ) {
    return {
      locale,
      href: null,
      label,
      available: false,
    };
  }

  return {
    locale,
    href: switchRouteLocale(currentRoute, locale),
    label,
    available: true,
  };
}

export function LanguageSwitcher({ locale, messages }: LanguageSwitcherProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const currentSearch =
    searchParams?.toString() ||
    (typeof window === "undefined" ? "" : window.location.search.slice(1));
  const options = supportedLocales.map((supportedLocale) =>
    buildLocaleOption(
      pathname,
      supportedLocale,
      new URLSearchParams(currentSearch),
      messages,
    ),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={messages.language.open}
          />
        }
      >
        <Globe className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        aria-label={messages.language.selectorLabel}
        className="w-56 rounded-xl border border-border bg-popover/95 p-2 backdrop-blur"
      >
        <p className="px-2 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {messages.language.selectorLabel}
        </p>
        <DropdownMenuSeparator />
        {options.map((option) =>
          option.available && option.href ? (
            <DropdownMenuItem
              key={option.locale}
              render={<Link href={option.href} />}
              className="rounded-lg px-3 py-2"
            >
              <span className="flex items-center gap-2">
                {option.locale === locale ? (
                  <Check className="size-4 text-primary" aria-hidden />
                ) : (
                  <span className="size-4" aria-hidden />
                )}
                <span>{option.label}</span>
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={option.locale}
              disabled
              className="justify-between rounded-lg px-3 py-2 text-muted-foreground"
            >
              <span>{option.label}</span>
              <span className="text-[11px]">
                {messages.language.unavailable}
              </span>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
