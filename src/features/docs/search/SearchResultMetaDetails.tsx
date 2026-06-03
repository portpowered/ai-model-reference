"use client";

import {
  formatPageKind,
  type UiMessages,
} from "@/lib/content/ui-messages.types";
import type { SearchResultMeta } from "@/lib/search/search-result-meta";
import { getMatchedTags } from "./search-result-meta-client";

export type SearchResultMetaDetailsProps = {
  url: string;
  query: string;
  meta: SearchResultMeta;
  messages: UiMessages;
};

/** Rich metadata panel shared by the global search dialog and `/search` results. */
export function SearchResultMetaDetails({
  url,
  query,
  meta,
  messages,
}: SearchResultMetaDetailsProps) {
  const matchedTags = getMatchedTags(query, meta.tags);
  const kindLabel = formatPageKind(messages, meta.kind);

  return (
    <div
      className="space-y-1 px-3 pb-2 ps-10 text-sm"
      data-testid="search-result-meta"
    >
      <p className="text-xs text-fd-muted-foreground">
        <span className="rounded-md border border-fd-border bg-fd-secondary px-1.5 py-0.5">
          {kindLabel}
        </span>
      </p>
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
      {matchedTags.length > 0 ? (
        <div
          className="flex flex-wrap gap-1"
          data-testid="search-result-matched-tags"
        >
          {matchedTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5 text-xs text-fd-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
