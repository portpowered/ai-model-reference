"use client";

import type { SearchItemType } from "fumadocs-ui/components/dialog/search";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { SearchResultRow } from "./SearchResultRow";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

export { isPageSearchItem } from "./SearchResultRow";

type SearchResultListItemProps = {
  item: SearchItemType;
  query: string;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  locale?: SiteLocale;
  onClick: () => void;
  className?: string;
};

type SearchInlineResultItemProps = {
  item: SearchItemType;
  query: string;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  locale?: SiteLocale;
  onSelect: (item: SearchItemType) => void;
  className?: string;
};

export function SearchResultListItem({
  item,
  query,
  metaByUrl,
  messages,
  locale = defaultLocale,
  onClick,
  className,
}: SearchResultListItemProps) {
  return (
    <SearchResultRow
      item={item}
      query={query}
      metaByUrl={metaByUrl}
      messages={messages}
      locale={locale}
      surface="dialog"
      onActivate={onClick}
      className={className}
    />
  );
}

export function SearchInlineResultItem({
  item,
  query,
  metaByUrl,
  messages,
  locale = defaultLocale,
  onSelect,
  className,
}: SearchInlineResultItemProps) {
  return (
    <SearchResultRow
      item={item}
      query={query}
      metaByUrl={metaByUrl}
      messages={messages}
      locale={locale}
      surface="page"
      onActivate={() => onSelect(item)}
      className={className}
    />
  );
}
