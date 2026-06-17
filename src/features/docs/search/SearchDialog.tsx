"use client";

import type { StaticOptions } from "fumadocs-core/search/client";
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
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { consumePendingSearchQuery } from "@/features/docs/search/search-prefill";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { matchLocalizedRoute } from "@/lib/i18n/locale-routing";
import { SearchResultListItem } from "./SearchResults";
import { useModelAtlasDocsSearch } from "./search-client";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

type ModelAtlasSearchDialogProps = SharedProps & {
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
  /** Test hook: override static bootstrap client options. */
  searchClient?: StaticOptions;
};

function reloadSearchPage(): void {
  window.location.reload();
}

export function ModelAtlasSearchDialog({
  open,
  onOpenChange,
  metaByUrl,
  messages,
  searchClient,
}: ModelAtlasSearchDialogProps) {
  const pathname = usePathname();
  const routeMatch = pathname ? matchLocalizedRoute(pathname) : null;
  const activeLocale =
    routeMatch?.kind === "matched" ? routeMatch.locale : "en";
  const { search, setSearch, query } = useModelAtlasDocsSearch({
    metaByUrl,
    client: searchClient,
  });
  const hasQuery = search.trim().length > 0;
  const items = query.data && query.data !== "empty" ? query.data : null;
  const showIdle = !hasQuery && !query.isLoading && !query.error;
  const showError = hasQuery && !query.isLoading && Boolean(query.error);
  const showEmptyResults =
    hasQuery &&
    !query.isLoading &&
    !query.error &&
    items !== null &&
    items.length === 0;

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
        {showIdle ? (
          <output
            className="block py-12 text-center text-sm text-fd-muted-foreground"
            data-testid="search-dialog-idle"
          >
            {messages.search.idle}
          </output>
        ) : null}
        {showError ? (
          <output
            className="block space-y-3 py-12 text-center text-sm text-fd-muted-foreground"
            data-testid="search-dialog-error"
            role="alert"
          >
            <p>{messages.search.error}</p>
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={reloadSearchPage}
            >
              {messages.search.retry}
            </button>
          </output>
        ) : null}
        <SearchDialogList
          items={showError ? null : items}
          Empty={() => (
            <output
              className="block py-12 text-center text-sm text-fd-muted-foreground"
              data-testid={
                query.isLoading
                  ? "search-dialog-loading"
                  : "search-dialog-empty"
              }
            >
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
              locale={activeLocale}
              onClick={onClick}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        />
        {showIdle || showEmptyResults ? null : (
          <SearchDialogFooter
            className="text-xs text-fd-muted-foreground"
            data-testid={query.isLoading ? "search-dialog-loading" : undefined}
            role={query.isLoading ? "status" : undefined}
          >
            {query.isLoading ? messages.search.loading : null}
          </SearchDialogFooter>
        )}
      </SearchDialogContent>
    </FumaSearchDialog>
  );
}
