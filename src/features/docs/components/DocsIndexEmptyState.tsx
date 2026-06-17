"use client";

import Link from "next/link";
import { SearchTrigger } from "@/features/docs/search/SearchTrigger";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

type DocsIndexEmptyStateProps = {
  title: string;
  description: string;
  homeLinkLabel: string;
  messages: UiMessages;
  locale?: SiteLocale;
};

export function DocsIndexEmptyState({
  title,
  description,
  homeLinkLabel,
  messages,
  locale = defaultLocale,
}: DocsIndexEmptyStateProps) {
  return (
    <output className="mt-8 block rounded-lg border border-border bg-card/40 p-6">
      <h2 className="font-serif text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={buildLocalizedRoute({ surface: "home" }, locale)}
          className="inline-flex items-center rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {homeLinkLabel}
        </Link>
        <SearchTrigger messages={messages} />
      </div>
    </output>
  );
}
