"use client";

import {
  SearchDialogListItem,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { SearchResultMetaDetails } from "./SearchResultMetaDetails";
import type { SearchResultMetaRecord } from "./search-result-meta-client";
import { resolveSearchResultMeta } from "./search-result-meta-client";

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
