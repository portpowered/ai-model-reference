"use client";

import { consumePendingSearchQuery } from "@/features/docs/search/search-prefill";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  SearchDialog as FumaSearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { useEffect } from "react";
import { SearchResultListItem } from "./SearchResults";
import { useModelAtlasDocsSearch } from "./search-client";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

type ModelAtlasSearchDialogProps = SharedProps & {
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
};

export function ModelAtlasSearchDialog({
  open,
  onOpenChange,
  metaByUrl,
  messages,
}: ModelAtlasSearchDialogProps) {
  const { search, setSearch, query } = useModelAtlasDocsSearch();
  const items = query.data && query.data !== "empty" ? query.data : null;
  const isEmpty = items !== null && items.length === 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    const prefill = consumePendingSearchQuery();
    if (prefill) {
      setSearch(prefill);
    }
  }, [open, setSearch]);

  return (
    <FumaSearchDialog
      open={open}
      onOpenChange={onOpenChange}
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput placeholder={messages.search.placeholder} />
          <SearchDialogClose>{messages.search.close}</SearchDialogClose>
        </SearchDialogHeader>
        <SearchDialogList
          items={items}
          Empty={() => (
            <output className="block py-12 text-center text-sm text-fd-muted-foreground">
              {query.isLoading
                ? messages.search.loading
                : messages.search.noResults}
            </output>
          )}
          Item={({ item, onClick }) => (
            <SearchResultListItem
              item={item}
              query={search}
              metaByUrl={metaByUrl}
              messages={messages}
              onClick={onClick}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        />
        {isEmpty ? null : (
          <SearchDialogFooter className="text-xs text-fd-muted-foreground">
            {query.isLoading ? messages.search.loading : null}
          </SearchDialogFooter>
        )}
      </SearchDialogContent>
    </FumaSearchDialog>
  );
}
