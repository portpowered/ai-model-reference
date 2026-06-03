"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { setPendingSearchQuery } from "@/features/docs/search/search-prefill";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type SearchEntryHandoffProps = {
  messages: UiMessages;
};

export function SearchEntryHandoff({ messages }: SearchEntryHandoffProps) {
  const { setOpenSearch, hotKey } = useSearchContext();
  const searchParams = useSearchParams();
  const tagSlug = searchParams.get("tag")?.trim() || undefined;
  const { searchEntry, search: searchCopy } = messages;

  const openSearch = () => {
    if (tagSlug) {
      setPendingSearchQuery(tagSlug);
    }
    setOpenSearch(true);
  };

  return (
    <div className="mt-6">
      {tagSlug ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {searchEntry.tagFilterDescription.replace("{tag}", tagSlug)}
        </p>
      ) : null}
      <button
        type="button"
        data-search=""
        aria-label={searchCopy.open}
        onClick={openSearch}
        className={[
          "flex w-full max-w-xl items-center gap-3 rounded-lg border border-input bg-card px-4 py-3 text-left text-sm shadow-sm",
          "text-muted-foreground transition-colors hover:border-ring hover:bg-secondary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ].join(" ")}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex-1">{searchCopy.placeholder}</span>
        {tagSlug ? (
          <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
            {tagSlug}
          </span>
        ) : null}
        <span className="inline-flex gap-0.5">
          {hotKey.map((key) => (
            <kbd
              key={String(key.display)}
              className="rounded-md border border-border bg-background px-1.5 text-xs text-foreground"
            >
              {key.display}
            </kbd>
          ))}
        </span>
      </button>
    </div>
  );
}
