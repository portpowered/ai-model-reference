"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_LINK_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import { Button } from "@/components/ui/button";
import { SearchTrigger } from "@/features/docs/search/SearchTrigger";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type ModelAtlasDocsHeaderProps = {
  messages: UiMessages;
  trailing?: ReactNode;
};

export function ModelAtlasDocsHeader({
  messages,
  trailing,
}: ModelAtlasDocsHeaderProps) {
  const primaryNavItems = getPrimaryNavItems(messages);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelId = useId();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
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
            className={PRIMARY_NAV_MOBILE_PANEL_CLASS}
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
        <nav className={PRIMARY_NAV_DESKTOP_CLASS} aria-label="Primary">
          {!menuOpen
            ? primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={PRIMARY_NAV_LINK_CLASS}
                >
                  {item.label}
                </Link>
              ))
            : null}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <SearchTrigger messages={messages} />
          {trailing}
        </div>
      </div>
    </header>
  );
}
