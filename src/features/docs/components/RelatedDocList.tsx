"use client";

import Link from "next/link";
import { docsChromeLinkClassName } from "@/features/docs/components/docs-chrome-link";
import { useOptionalPageMessagesContext } from "@/features/docs/components/page-messages-context";
import type { RelatedDocItem } from "@/lib/content/related-docs";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import {
  defaultLocale,
  matchLocalizedRoute,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";

type RelatedDocListProps = {
  items: RelatedDocItem[];
  testId?: string;
  groupId?: string;
};

function localizeRelatedHref(href: string, locale: SiteLocale): string {
  if (locale === defaultLocale) {
    return href;
  }

  const match = matchLocalizedRoute(href);
  if (match.kind !== "matched") {
    return href;
  }

  if (
    match.destination.surface === "docs-page" &&
    !isShippedLocalizedDocsSlug(match.destination.slug, locale)
  ) {
    return href;
  }

  return switchRouteLocale(href, locale);
}

export function RelatedDocList({
  items,
  testId = "related-docs",
  groupId,
}: RelatedDocListProps) {
  const pageContext = useOptionalPageMessagesContext();

  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      className="space-y-3"
      data-testid={testId}
      {...(groupId ? { "data-related-group": groupId } : {})}
    >
      {items.map((item) => {
        const href =
          item.href && pageContext
            ? localizeRelatedHref(item.href, pageContext.locale)
            : item.href;

        return (
          <li
            key={item.registryId}
            className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            data-planned={item.isPlanned ? "true" : undefined}
          >
            {href ? (
              <Link
                href={href}
                className={`text-sm text-foreground ${docsChromeLinkClassName}`}
              >
                {item.title}
              </Link>
            ) : (
              <span className="text-sm text-foreground">{item.title}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {item.reasonLabel}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
