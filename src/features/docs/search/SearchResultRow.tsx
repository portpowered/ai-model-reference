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

export type SearchResultRowProps = {
  item: SearchItemType;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  surface: "dialog" | "page";
  onActivate: () => void;
  className?: string;
};

/** Shared page-level search result row for the global dialog and `/search`. */
export function SearchResultRow({
  item,
  metaByUrl,
  messages,
  surface,
  onActivate,
  className,
}: SearchResultRowProps) {
  if (!isPageSearchItem(item)) {
    if (surface === "dialog") {
      return (
        <SearchDialogListItem
          item={item}
          onClick={onActivate}
          className={className}
        />
      );
    }

    return (
      <button type="button" onClick={onActivate} className={className}>
        <span className="text-sm text-muted-foreground">
          {searchItemTitle(item)}
        </span>
      </button>
    );
  }

  const meta = resolveSearchResultMeta(item.url, metaByUrl);
  const title = searchItemTitle(item);
  const containerClassName =
    surface === "dialog"
      ? "flex flex-col border-b border-fd-border last:border-b-0"
      : "flex flex-col";

  const titleNode =
    surface === "dialog" ? (
      <SearchDialogListItem
        item={item}
        onClick={onActivate}
        className={className}
      />
    ) : (
      <button type="button" onClick={onActivate} className={className}>
        <span className="font-medium text-foreground">{title}</span>
      </button>
    );

  return (
    <div className={containerClassName}>
      {titleNode}
      {meta ? (
        <SearchResultMetaDetails
          url={item.url}
          meta={meta}
          messages={messages}
        />
      ) : null}
    </div>
  );
}
