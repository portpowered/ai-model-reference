"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_LINK_CLASS,
} from "@/components/layout/primary-nav";
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

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <nav
          className="flex flex-1 flex-wrap items-center gap-4 text-sm"
          aria-label="Primary"
        >
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={PRIMARY_NAV_LINK_CLASS}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SearchTrigger messages={messages} />
          {trailing}
        </div>
      </div>
    </header>
  );
}
