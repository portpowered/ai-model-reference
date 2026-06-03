"use client";

import {
  type UiMessages,
  formatPageKind,
} from "@/lib/content/ui-messages.types";
import {
  SearchDialogListItem,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search";
import type { SearchResultMetaRecord } from "./search-result-meta-client";
import {
  getMatchedTags,
  resolveSearchResultMeta,
} from "./search-result-meta-client";

type SearchResultListItemProps = {
  item: SearchItemType;
  query: string;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  onClick: () => void;
  className?: string;
};

export function SearchResultListItem({
  item,
  query,
  metaByUrl,
  messages,
  onClick,
  className,
}: SearchResultListItemProps) {
  if (item.type !== "page") {
    return (
      <SearchDialogListItem
        item={item}
        onClick={onClick}
        className={className}
      />
    );
  }

  const meta = resolveSearchResultMeta(item.url, metaByUrl);
  const matchedTags = meta ? getMatchedTags(query, meta.tags) : [];

  return (
    <div className="flex flex-col border-b border-fd-border last:border-b-0">
      <SearchDialogListItem
        item={item}
        onClick={onClick}
        className={className}
      />
      {meta ? (
        <div className="space-y-1 px-3 pb-2 ps-10 text-sm">
          <p className="text-xs text-fd-muted-foreground">
            <span className="rounded-md border border-fd-border bg-fd-secondary px-1.5 py-0.5">
              {formatPageKind(messages, meta.kind)}
            </span>
          </p>
          {meta.description ? (
            <p className="line-clamp-2 text-fd-muted-foreground">
              {meta.description}
            </p>
          ) : null}
          {matchedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
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
      ) : null}
    </div>
  );
}
