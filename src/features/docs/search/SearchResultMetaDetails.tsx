"use client";

import {
  formatPageKind,
  type UiMessages,
} from "@/lib/content/ui-messages.types";
import type { SearchResultMeta } from "@/lib/search/search-result-meta";

export type SearchResultMetaDetailsProps = {
  url: string;
  meta: SearchResultMeta;
  messages: UiMessages;
};

/** Thin metadata panel shared by the global search dialog and `/search` results. */
export function SearchResultMetaDetails({
  url,
  meta,
  messages,
}: SearchResultMetaDetailsProps) {
  const kindLabel = formatPageKind(messages, meta.kind);

  return (
    <div
      className="space-y-0.5 px-3 pb-2 ps-10 text-sm"
      data-testid="search-result-meta"
    >
      {meta.description ? (
        <p
          className="line-clamp-2 text-fd-muted-foreground"
          data-testid="search-result-summary"
        >
          {meta.description}
        </p>
      ) : null}
      <p
        className="truncate font-mono text-xs text-fd-muted-foreground"
        data-testid="search-result-url"
      >
        <span className="sr-only">{messages.search.resultPath}: </span>
        <span aria-hidden="true">{url}</span>
      </p>
      <p
        className="text-xs text-fd-muted-foreground"
        data-testid="search-result-kind"
      >
        {kindLabel}
      </p>
    </div>
  );
}
