"use client";

import {
  formatPageKind,
  type UiMessages,
} from "@/lib/content/ui-messages.types";
import type { SearchResultMeta } from "@/lib/search/search-result-meta";
import { cn } from "@/lib/utils";
import {
  searchResultMetaEmbeddedFieldClassName,
  searchResultMetaEmbeddedPanelClassName,
} from "./search-result-row-classes";

export type SearchResultMetaDetailsProps = {
  url: string;
  meta: SearchResultMeta;
  messages: UiMessages;
  /** When true, metadata sits inside the interactive result row (dialog or `/search`). */
  embedded?: boolean;
  className?: string;
};

/** Thin metadata panel shared by the global search dialog and `/search` results. */
export function SearchResultMetaDetails({
  url,
  meta,
  messages,
  embedded = false,
  className,
}: SearchResultMetaDetailsProps) {
  const kindLabel = formatPageKind(messages, meta.kind);
  const embeddedFieldClassName = embedded
    ? searchResultMetaEmbeddedFieldClassName
    : "text-fd-muted-foreground";

  return (
    <div
      className={cn(
        "space-y-0.5 text-sm",
        embedded
          ? searchResultMetaEmbeddedPanelClassName
          : "px-3 pb-2 ps-10 text-fd-muted-foreground",
        className,
      )}
      data-testid="search-result-meta"
    >
      {meta.description ? (
        <p
          className={cn("line-clamp-2", embeddedFieldClassName)}
          data-testid="search-result-summary"
        >
          {meta.description}
        </p>
      ) : null}
      <p
        className={cn("truncate font-mono text-xs", embeddedFieldClassName)}
        data-testid="search-result-url"
      >
        <span className="sr-only">{messages.search.resultPath}: </span>
        <span aria-hidden="true">{url}</span>
      </p>
      <p
        className={cn("text-xs", embeddedFieldClassName)}
        data-testid="search-result-kind"
      >
        {kindLabel}
      </p>
    </div>
  );
}
