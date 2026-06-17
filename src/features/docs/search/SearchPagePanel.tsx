"use client";

import type { StaticOptions } from "fumadocs-core/search/client";
import type { SearchItemType } from "fumadocs-ui/components/dialog/search";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchInlineResultsListClassName } from "@/features/docs/components/list-decoration";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";
import { SearchInlineResultItem } from "./SearchResults";
import { useModelAtlasDocsSearch } from "./search-client";
import {
  EMPTY_SEARCH_PAGE_HANDOFF,
  encodeSearchPageHandoffKey,
  hasSearchPageHandoff,
  readSearchPageHandoffFromLocationSearch,
  resolveInitialSearchPageQuery,
  type SearchPageHandoff,
} from "./search-page-query";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

export type SearchPagePanelContentProps = {
  messages: UiMessages;
  metaByUrl: SearchResultMetaRecord;
  handoff: SearchPageHandoff;
  locale?: SiteLocale;
  /** Test hook: override static bootstrap client options. */
  searchClient?: StaticOptions;
};

function reloadSearchPage(): void {
  window.location.reload();
}

function resolveEffectiveSearchPageHandoff(
  serverHandoff: SearchPageHandoff,
  clientHandoff: SearchPageHandoff | null,
): SearchPageHandoff {
  if (hasSearchPageHandoff(serverHandoff)) {
    return serverHandoff;
  }
  return clientHandoff ?? EMPTY_SEARCH_PAGE_HANDOFF;
}

export function SearchPagePanelContent({
  messages,
  metaByUrl,
  handoff,
  locale = defaultLocale,
  searchClient,
}: SearchPagePanelContentProps) {
  const router = useRouter();
  const appliedHandoffKeyRef = useRef<string | null>(null);
  const [clientHandoff, setClientHandoff] = useState<SearchPageHandoff | null>(
    null,
  );
  const { searchEntry, search: searchCopy } = messages;
  const { search, setSearch, query } = useModelAtlasDocsSearch({
    metaByUrl,
    locale,
    client: searchClient,
  });
  const effectiveHandoff = resolveEffectiveSearchPageHandoff(
    handoff,
    clientHandoff,
  );
  const tagSlug = effectiveHandoff.tag?.trim() || undefined;
  const queryParam = effectiveHandoff.q;

  useEffect(() => {
    const resolvedHandoff = hasSearchPageHandoff(handoff)
      ? handoff
      : readSearchPageHandoffFromLocationSearch();

    if (!hasSearchPageHandoff(handoff)) {
      setClientHandoff(resolvedHandoff);
    }

    const initial = resolveInitialSearchPageQuery(
      resolvedHandoff.q,
      resolvedHandoff.tag,
    );
    if (!initial) {
      return;
    }

    const handoffKey = encodeSearchPageHandoffKey(resolvedHandoff);
    if (appliedHandoffKeyRef.current === handoffKey) {
      return;
    }

    appliedHandoffKeyRef.current = handoffKey;
    setSearch(initial);
  }, [handoff, setSearch]);

  const hasQuery = search.trim().length > 0;
  const items = query.data && query.data !== "empty" ? query.data : null;
  const showIdle = !hasQuery && !query.isLoading && !query.error;
  const showError = hasQuery && !query.isLoading && Boolean(query.error);
  const showEmpty =
    hasQuery &&
    !query.isLoading &&
    !query.error &&
    items !== null &&
    items.length === 0;
  const showResults =
    hasQuery && !query.error && items !== null && items.length > 0;

  const onSelect = (item: SearchItemType) => {
    if (item.type === "action") {
      return;
    }
    router.push(switchRouteLocale(item.url, locale));
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
        {showError ? (
          <output
            className="block space-y-3 py-4 text-sm text-muted-foreground"
            data-testid="search-page-error"
            role="alert"
          >
            <p>{searchCopy.error}</p>
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={reloadSearchPage}
            >
              {searchCopy.retry}
            </button>
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
                href={buildLocalizedRoute(
                  { surface: "tag-page", slug: "attention" },
                  locale,
                )}
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
            className={searchInlineResultsListClassName}
            data-testid="search-page-results"
          >
            {items.map((item) => (
              <li key={item.id}>
                <SearchInlineResultItem
                  item={item}
                  query={search}
                  metaByUrl={metaByUrl}
                  messages={messages}
                  locale={locale}
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

type SearchPagePanelProps = Omit<SearchPagePanelContentProps, "handoff">;

export function SearchPagePanel({ messages, metaByUrl }: SearchPagePanelProps) {
  const searchParams = useSearchParams();

  return (
    <SearchPagePanelContent
      messages={messages}
      metaByUrl={metaByUrl}
      handoff={{
        q: searchParams.get("q"),
        tag: searchParams.get("tag"),
      }}
      locale={defaultLocale}
    />
  );
}
