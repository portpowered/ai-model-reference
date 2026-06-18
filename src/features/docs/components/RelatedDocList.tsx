"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { docsChromeLinkClassName } from "@/features/docs/components/docs-chrome-link";
import { useOptionalPageMessagesContext } from "@/features/docs/components/page-messages-context";
import { localizeDocsHref } from "@/lib/content/localized-docs-href";
import type { RelatedDocItem } from "@/lib/content/related-docs";

type RelatedDocListProps = {
  items: RelatedDocItem[];
  testId?: string;
  groupId?: string;
};

const DEFAULT_VISIBLE_ITEMS = 5;

export function RelatedDocList({
  items,
  testId = "related-docs",
  groupId,
}: RelatedDocListProps) {
  const pageContext = useOptionalPageMessagesContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const listId = useId();

  if (items.length === 0) {
    return null;
  }

  const hasOverflow = items.length > DEFAULT_VISIBLE_ITEMS;
  const hiddenCount = hasOverflow ? items.length - DEFAULT_VISIBLE_ITEMS : 0;

  return (
    <div className="space-y-3">
      <ul
        id={listId}
        className="space-y-3"
        data-testid={testId}
        {...(groupId ? { "data-related-group": groupId } : {})}
      >
        {items.map((item, index) => {
          const href =
            item.href && pageContext
              ? localizeDocsHref(item.href, pageContext.locale)
              : item.href;
          const isHidden =
            hasOverflow && index >= DEFAULT_VISIBLE_ITEMS && !isExpanded;

          return (
            <li
              key={item.registryId}
              className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              data-planned={item.isPlanned ? "true" : undefined}
              hidden={isHidden}
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
      {hasOverflow ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-controls={listId}
          aria-expanded={isExpanded}
          className="h-auto px-0 text-sm text-primary hover:bg-transparent hover:text-primary/80"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </Button>
      ) : null}
    </div>
  );
}
