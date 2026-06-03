"use client";

import type { SearchItemType } from "fumadocs-ui/components/dialog/search";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { SearchInlineResultItem } from "./SearchResults";
import { useModelAtlasDocsSearch } from "./search-client";
import { resolveInitialSearchPageQuery } from "./search-page-query";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

const ATTENTION_TAG_PATH = "/tags/attention";

type SearchPagePanelProps = {
  messages: UiMessages;
  metaByUrl: SearchResultMetaRecord;
};

export function SearchPagePanel({ messages, metaByUrl }: SearchPagePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQueryApplied = useRef(false);
  const { searchEntry, search: searchCopy } = messages;
  const { search, setSearch, query } = useModelAtlasDocsSearch();

  const tagSlug = searchParams.get("tag")?.trim() || undefined;
  const queryParam = searchParams.get("q");

  useEffect(() => {
    if (initialQueryApplied.current) {
      return;
    }
    initialQueryApplied.current = true;
    const initial = resolveInitialSearchPageQuery(queryParam, tagSlug ?? null);
    if (initial) {
      setSearch(initial);
    }
  }, [queryParam, setSearch, tagSlug]);

  const hasQuery = search.trim().length > 0;
  const items = query.data && query.data !== "empty" ? query.data : null;
  const showIdle = !hasQuery && !query.isLoading;
  const showEmpty =
    hasQuery && !query.isLoading && items !== null && items.length === 0;
  const showResults = hasQuery && items !== null && items.length > 0;

  const onSelect = (item: SearchItemType) => {
    if (item.type === "action") {
      return;
    }
    router.push(item.url);
  };

  return (
    <div className="mt-6">
      {tagSlug && !queryParam ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {searchEntry.tagFilterDescription.replace("{tag}", tagSlug)}
        </p>
      ) : null}
      <label className="sr-only" htmlFor="search-page-input">
        {searchCopy.placeholder}
      </label>
      <div className="flex w-full max-w-xl items-center gap-3 rounded-lg border border-input bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          id="search-page-input"
          data-search=""
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchCopy.placeholder}
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div
        className="mt-6 min-h-32 w-full max-w-xl"
        aria-live="polite"
        aria-busy={query.isLoading || undefined}
      >
        {showIdle ? (
          <output
            className="block text-sm text-muted-foreground"
            data-testid="search-page-idle"
          >
            {searchCopy.idle}
          </output>
        ) : null}
        {query.isLoading && hasQuery ? (
          <output
            className="block py-4 text-sm text-muted-foreground"
            data-testid="search-page-loading"
          >
            {searchCopy.loading}
          </output>
        ) : null}
        {showEmpty ? (
          <output
            className="block space-y-2 py-4 text-sm text-muted-foreground"
            data-testid="search-page-empty"
          >
            <p>{searchCopy.noResults}</p>
            <p>
              {searchEntry.emptySuggestionPrefix}{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setSearch(searchEntry.emptySuggestionGqa)}
              >
                {searchEntry.emptySuggestionGqa}
              </button>{" "}
              {searchEntry.emptySuggestionMiddle}{" "}
              <Link
                href={ATTENTION_TAG_PATH}
                className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {searchEntry.emptySuggestionAttentionLinkLabel}
              </Link>
              {searchEntry.emptySuggestionSuffix}
            </p>
          </output>
        ) : null}
        {showResults ? (
          <ul
            className="divide-y divide-border rounded-lg border border-border"
            data-testid="search-page-results"
          >
            {items.map((item) => (
              <li key={item.id}>
                <SearchInlineResultItem
                  item={item}
                  query={search}
                  metaByUrl={metaByUrl}
                  messages={messages}
                  onSelect={onSelect}
                  className="w-full px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
