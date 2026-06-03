"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { setPendingSearchQuery } from "@/features/docs/search/search-prefill";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type TagSearchHandoffProps = {
  messages: UiMessages;
  tagSlug: string;
  searchQuery: string;
  label: string;
};

export function TagSearchHandoff({
  messages,
  tagSlug,
  searchQuery,
  label,
}: TagSearchHandoffProps) {
  const { setOpenSearch } = useSearchContext();

  return (
    <button
      type="button"
      data-search=""
      aria-label={messages.search.open}
      onClick={() => {
        setPendingSearchQuery(searchQuery);
        setOpenSearch(true);
      }}
      className={[
        "inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground transition-colors",
        "hover:border-ring hover:bg-secondary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      ].join(" ")}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
      <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
        {tagSlug}
      </span>
    </button>
  );
}
