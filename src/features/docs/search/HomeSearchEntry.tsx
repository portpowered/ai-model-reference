"use client";

import type { UiMessages } from "@/lib/content/ui-messages.types";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";

type HomeSearchEntryProps = {
  messages: UiMessages;
};

export function HomeSearchEntry({ messages }: HomeSearchEntryProps) {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      type="button"
      data-search=""
      aria-label={messages.search.open}
      onClick={() => setOpenSearch(true)}
      className={[
        "flex w-full max-w-xl items-center gap-3 rounded-lg border border-input bg-card px-4 py-3 text-left text-sm shadow-sm",
        "text-muted-foreground transition-colors hover:border-ring hover:bg-secondary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      ].join(" ")}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1">{messages.search.placeholder}</span>
      <span className="inline-flex gap-0.5">
        {hotKey.map((key, index) => (
          <kbd
            key={`${key.key}-${index}`}
            className="rounded-md border border-border bg-background px-1.5 text-xs text-foreground"
          >
            {key.display}
          </kbd>
        ))}
      </span>
    </button>
  );
}
