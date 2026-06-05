"use client";

import type { SearchItemType } from "fumadocs-ui/components/dialog/search";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { SearchResultRow } from "./SearchResultRow";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

export { isPageSearchItem } from "./SearchResultRow";

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

export function SearchResultListItem({
  item,
  metaByUrl,
  messages,
  onClick,
  className,
}: SearchResultListItemProps) {
  return (
    <SearchResultRow
      item={item}
      metaByUrl={metaByUrl}
      messages={messages}
      surface="dialog"
      onActivate={onClick}
      className={className}
    />
  );
}

export function SearchInlineResultItem({
  item,
  metaByUrl,
  messages,
  onSelect,
  className,
}: SearchInlineResultItemProps) {
  return (
    <SearchResultRow
      item={item}
      metaByUrl={metaByUrl}
      messages={messages}
      surface="page"
      onActivate={() => onSelect(item)}
      className={className}
    />
  );
}
