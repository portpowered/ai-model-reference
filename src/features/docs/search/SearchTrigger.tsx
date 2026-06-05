"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type SearchTriggerProps = Omit<ComponentProps<"button">, "type"> & {
  messages: UiMessages;
  hideIfDisabled?: boolean;
};

export function SearchTrigger({
  messages,
  hideIfDisabled,
  className,
  ...props
}: SearchTriggerProps) {
  const { setOpenSearch, enabled, hotKey } = useSearchContext();

  if (hideIfDisabled && !enabled) {
    return null;
  }

  return (
    <button
      type="button"
      data-search=""
      aria-label={messages.search.open}
      onClick={() => setOpenSearch(true)}
      className={[
        "group inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-sm text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span>{messages.search.shortcut}</span>
      <span className="ms-1 inline-flex gap-0.5">
        {hotKey.map((key) => (
          <kbd
            key={String(key.display)}
            className={[
              "rounded-md border border-border bg-background px-1.5 text-xs text-foreground",
              "group-hover:border-accent-foreground/25 group-hover:bg-accent-foreground/10 group-hover:text-accent-foreground",
              "group-focus-visible:border-accent-foreground/25 group-focus-visible:bg-accent-foreground/10 group-focus-visible:text-accent-foreground",
            ].join(" ")}
          >
            {key.display}
          </kbd>
        ))}
      </span>
    </button>
  );
}
