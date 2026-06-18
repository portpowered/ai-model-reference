"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_LINK_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import { Button } from "@/components/ui/button";
import { SearchTrigger } from "@/features/docs/search/SearchTrigger";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

type ModelAtlasDocsHeaderProps = {
  messages: UiMessages;
  locale?: SiteLocale;
  trailing?: ReactNode;
};

export function ModelAtlasDocsHeader({
  messages,
  locale = defaultLocale,
  trailing,
}: ModelAtlasDocsHeaderProps) {
  const primaryNavItems = getPrimaryNavItems(messages, locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelId = useId();

  return (
    <header className="border-b border-border">
      <div className="grid w-full grid-cols-[auto_1fr] items-center gap-4 px-4 py-3 [--fd-layout-width:97rem] [--fd-sidebar-width:0px] [--fd-toc-width:0px] md:grid-cols-[minmax(min-content,1fr)_var(--fd-sidebar-width,268px)_minmax(0,calc(var(--fd-layout-width,97rem)-var(--fd-sidebar-width,268px)-var(--fd-toc-width,0px)))_var(--fd-toc-width,0px)_minmax(min-content,1fr)] md:px-0 md:[--fd-sidebar-width:268px] xl:[--fd-toc-width:268px]">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS}
          aria-expanded={menuOpen}
          aria-controls={menuPanelId}
          aria-label={messages.nav.menu}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu className="size-4" aria-hidden />
        </Button>
        {menuOpen ? (
          <nav
            id={menuPanelId}
            className={`${PRIMARY_NAV_MOBILE_PANEL_CLASS} col-span-2`}
            aria-label="Primary"
          >
            <ul className="flex flex-col gap-2 text-sm">
              {primaryNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={PRIMARY_NAV_LINK_CLASS}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {!menuOpen ? (
          <nav
            className="hidden md:col-start-3 md:col-end-4 md:row-start-1 md:block"
            aria-label="Primary"
          >
            <div className="mx-auto flex w-full max-w-[900px] items-center gap-4 px-6 xl:px-8">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={PRIMARY_NAV_LINK_CLASS}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
        <div className="pointer-events-none col-start-2 row-start-1 ms-auto flex items-center gap-2 md:col-start-3 md:col-end-5 md:mx-auto md:w-full md:max-w-[1168px] md:justify-end md:px-6 xl:px-8">
          <div className="pointer-events-auto">
            <SearchTrigger messages={messages} />
          </div>
          <div className="pointer-events-auto">
            <LanguageSwitcher locale={locale} messages={messages} />
          </div>
          {trailing ? <div className="pointer-events-auto">{trailing}</div> : null}
        </div>
      </div>
    </header>
  );
}
