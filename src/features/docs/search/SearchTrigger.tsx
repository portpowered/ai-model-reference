"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { type ComponentProps, useState } from "react";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { cn } from "@/lib/utils";

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
  const [hovered, setHovered] = useState(false);

  if (hideIfDisabled && !enabled) {
    return null;
  }

  return (
    <button
      type="button"
      data-search=""
      aria-label={messages.search.open}
      onClick={() => setOpenSearch(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "hover:!border-accent hover:!bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group inline-flex h-9 items-center gap-2 rounded-lg !border !border-border !bg-secondary/50 !px-2 !py-1.5 text-sm text-muted-foreground transition-colors",
        className,
      )}
      style={
        hovered
          ? {
              backgroundColor: "var(--accent)",
              borderColor: "var(--accent)",
              color: "var(--accent-foreground)",
            }
          : undefined
      }
      {...props}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span>{messages.search.shortcut}</span>
      <span className="ms-1 hidden gap-0.5 md:inline-flex">
        {hotKey.map((key) => (
          <kbd
            key={String(key.display)}
            className={[
              "rounded-md border border-border bg-background px-1.5 text-xs text-foreground",
              "group-hover:border-accent-foreground/25 group-hover:bg-accent-foreground/10 group-hover:text-accent-foreground",
              "group-focus-visible:border-accent-foreground/25 group-focus-visible:bg-accent-foreground/10 group-focus-visible:text-accent-foreground",
            ].join(" ")}
            style={
              hovered
                ? {
                    borderColor:
                      "color-mix(in oklch, var(--accent-foreground) 25%, transparent)",
                    backgroundColor:
                      "color-mix(in oklch, var(--accent-foreground) 10%, transparent)",
                    color: "var(--accent-foreground)",
                  }
                : undefined
            }
          >
            {key.display}
          </kbd>
        ))}
      </span>
    </button>
  );
}
