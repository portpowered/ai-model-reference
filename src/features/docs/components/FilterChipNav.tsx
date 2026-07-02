"use client";

import Link from "next/link";
import type { KeyboardEvent, MouseEvent } from "react";
import { docsChromePillLinkClassName } from "@/features/docs/components/docs-chrome-link";

export type FilterChipNavItem = {
  id: string;
  href: string;
  label: string;
  active?: boolean;
  ariaCurrent?: "page" | "step" | "location" | "date" | "time" | true;
  count?: number;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type FilterChipNavProps = {
  items: readonly FilterChipNavItem[];
  labels: {
    navigation: string;
    count?: string;
  };
  className?: string;
  itemClassName?: string;
  linkClassName?: string;
  listClassName?: string;
};

function moveChipFocus(
  event: KeyboardEvent<HTMLElement>,
  direction: "next" | "previous" | "first" | "last",
) {
  const chips = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      "[data-filter-chip='true']",
    ),
  ];
  if (chips.length === 0) {
    return;
  }

  const activeIndex = chips.indexOf(document.activeElement as HTMLElement);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  let nextIndex = currentIndex;
  switch (direction) {
    case "next":
      nextIndex = (currentIndex + 1) % chips.length;
      break;
    case "previous":
      nextIndex = (currentIndex - 1 + chips.length) % chips.length;
      break;
    case "first":
      nextIndex = 0;
      break;
    case "last":
      nextIndex = chips.length - 1;
      break;
  }

  chips[nextIndex]?.focus();
}

function onChipListKeyDown(event: KeyboardEvent<HTMLElement>) {
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      event.preventDefault();
      moveChipFocus(event, "next");
      break;
    case "ArrowLeft":
    case "ArrowUp":
      event.preventDefault();
      moveChipFocus(event, "previous");
      break;
    case "Home":
      event.preventDefault();
      moveChipFocus(event, "first");
      break;
    case "End":
      event.preventDefault();
      moveChipFocus(event, "last");
      break;
  }
}

export function FilterChipNav({
  items,
  labels,
  className,
  itemClassName,
  linkClassName,
  listClassName,
}: FilterChipNavProps) {
  return (
    <nav aria-label={labels.navigation} className={className}>
      <ul
        className={["m-0 flex list-none flex-wrap gap-2 p-0", listClassName]
          .filter(Boolean)
          .join(" ")}
        onKeyDown={onChipListKeyDown}
      >
        {items.map((item) => (
          <li key={item.id} className={itemClassName}>
            <Link
              aria-current={item.ariaCurrent}
              className={[
                docsChromePillLinkClassName,
                item.active
                  ? "border-primary bg-primary/15 text-foreground"
                  : "bg-secondary/50 text-foreground hover:border-ring hover:bg-secondary",
                linkClassName,
              ].join(" ")}
              data-filter-chip="true"
              href={item.href}
              onClick={item.onClick}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" && labels.count ? (
                <>
                  <span className="sr-only">
                    {labels.count.replace("{count}", String(item.count))}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-2 rounded-sm bg-background/60 px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {item.count}
                  </span>
                </>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
