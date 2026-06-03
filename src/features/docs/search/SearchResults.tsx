"use client";

import {
  SearchDialogListItem,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { SearchResultMetaDetails } from "./SearchResultMetaDetails";
import type { SearchResultMetaRecord } from "./search-result-meta-client";
import { resolveSearchResultMeta } from "./search-result-meta-client";

function searchItemTitle(item: SearchItemType): string {
  if (item.type === "action") {
    return "Action";
  }
  if (typeof item.content === "string") {
    return item.content;
  }
  return item.type === "page" ? item.url : "Result";
}

export function isPageSearchItem(
  item: SearchItemType,
): item is SearchItemType & { type: "page" } {
  return item.type === "page";
}

type SearchResultListItemProps = {
  item: SearchItemType;
  query: string;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  onClick: () => void;
  className?: string;
};

type SearchInlineResultItemProps = {
  item: SearchItemType;
  query: string;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  onSelect: (item: SearchItemType) => void;
  className?: string;
};

export function SearchInlineResultItem({
  item,
  query,
  metaByUrl,
  messages,
  onSelect,
  className,
}: SearchInlineResultItemProps) {
  const title = searchItemTitle(item);

  if (!isPageSearchItem(item)) {
    return (
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={className}
      >
        <span className="text-sm text-muted-foreground">{title}</span>
      </button>
    );
  }

  const meta = resolveSearchResultMeta(item.url, metaByUrl);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={className}
      >
        <span className="font-medium text-foreground">{title}</span>
      </button>
      {meta ? (
        <SearchResultMetaDetails
          url={item.url}
          query={query}
          meta={meta}
          messages={messages}
        />
      ) : null}
    </div>
  );
}

export function SearchResultListItem({
  item,
  query,
  metaByUrl,
  messages,
  onClick,
  className,
}: SearchResultListItemProps) {
  if (!isPageSearchItem(item)) {
    return (
      <SearchDialogListItem
        item={item}
        onClick={onClick}
        className={className}
      />
    );
  }

  const meta = resolveSearchResultMeta(item.url, metaByUrl);

  return (
    <div className="flex flex-col border-b border-fd-border last:border-b-0">
      <SearchDialogListItem
        item={item}
        onClick={onClick}
        className={className}
      />
      {meta ? (
        <SearchResultMetaDetails
          url={item.url}
          query={query}
          meta={meta}
          messages={messages}
        />
      ) : null}
    </div>
  );
}
