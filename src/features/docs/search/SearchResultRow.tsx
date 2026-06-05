"use client";

import {
  SearchDialogListItem,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { cn } from "@/lib/utils";
import { SearchResultMetaDetails } from "./SearchResultMetaDetails";
import { SearchResultTitle } from "./SearchResultTitle";
import type { SearchResultMetaRecord } from "./search-result-meta-client";
import { resolveSearchResultMeta } from "./search-result-meta-client";
import {
  searchDialogResultRowClassName,
  searchPageResultRowClassName,
} from "./search-result-row-classes";
import { stripSearchResultTitleMarks } from "./search-result-title-content";

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
  query: string;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  surface: "dialog" | "page";
  onActivate: () => void;
  className?: string;
};

/** Shared page-level search result row for the global dialog and `/search`. */
export function SearchResultRow({
  item,
  query,
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
  const accessibleTitle = stripSearchResultTitleMarks(title);
  const titleNode = (
    <SearchResultTitle
      content={title}
      query={query}
      className={
        surface === "page"
          ? "text-foreground group-hover:text-inherit group-focus-visible:text-inherit"
          : undefined
      }
    />
  );
  const metaPanel = meta ? (
    <SearchResultMetaDetails
      url={item.url}
      meta={meta}
      messages={messages}
      embedded
    />
  ) : null;

  if (surface === "dialog") {
    return (
      <SearchDialogListItem
        item={item}
        onClick={onActivate}
        aria-label={accessibleTitle}
        data-testid="search-result-row"
        className={cn(
          searchDialogResultRowClassName,
          "border-b border-fd-border last:border-b-0",
          className,
        )}
      >
        {titleNode}
        {metaPanel}
      </SearchDialogListItem>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={accessibleTitle}
      data-testid="search-result-row"
      className={cn(searchPageResultRowClassName, className)}
    >
      {titleNode}
      {metaPanel}
    </button>
  );
}
