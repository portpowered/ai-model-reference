"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";
import { docsChromePillLinkClassName } from "@/features/docs/components/docs-chrome-link";
import type { OntologyTimelineClassificationSlice } from "@/lib/content/ontology-timeline";

type TimelineClassificationChipsProps = {
  basePath: string;
  chips: readonly OntologyTimelineClassificationSlice[];
  labels: {
    navigation: string;
    eventCount: string;
  };
};

function moveChipFocus(
  event: KeyboardEvent<HTMLElement>,
  direction: "next" | "previous" | "first" | "last",
) {
  const chips = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      "[data-classification-chip='true']",
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

export function TimelineClassificationChips({
  basePath,
  chips,
  labels,
}: TimelineClassificationChipsProps) {
  return (
    <nav aria-label={labels.navigation} className="mt-6">
      <ul
        className="m-0 flex list-none flex-wrap gap-2 p-0"
        onKeyDown={onChipListKeyDown}
      >
        {chips.map((chip) => {
          const href = `${basePath}?classification=${encodeURIComponent(chip.slug)}`;

          return (
            <li key={chip.classificationId}>
              <Link
                aria-current={chip.active ? "page" : undefined}
                className={[
                  docsChromePillLinkClassName,
                  chip.active
                    ? "border-primary bg-primary/15 text-foreground"
                    : "bg-secondary/50 text-foreground hover:border-ring hover:bg-secondary",
                ].join(" ")}
                data-classification-chip="true"
                href={href}
              >
                <span>{chip.title}</span>
                <span className="sr-only">
                  {labels.eventCount.replace(
                    "{count}",
                    String(chip.eventCount),
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="ml-2 rounded-sm bg-background/60 px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  {chip.eventCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
