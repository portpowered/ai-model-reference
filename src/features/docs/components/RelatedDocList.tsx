"use client";

import Link from "next/link";
import { docsChromeLinkClassName } from "@/features/docs/components/docs-chrome-link";
import { useOptionalPageMessagesContext } from "@/features/docs/components/page-messages-context";
import { localizeDocsHref } from "@/lib/content/localized-docs-href";
import type { RelatedDocItem } from "@/lib/content/related-docs";

type RelatedDocListProps = {
  items: RelatedDocItem[];
  testId?: string;
  groupId?: string;
};

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
            ? localizeDocsHref(item.href, pageContext.locale)
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
