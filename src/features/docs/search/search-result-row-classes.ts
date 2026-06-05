import { cn } from "@/lib/utils";

/** Shared interactive row styles for page hits on `/search`. */
export const searchPageResultRowClassName = cn(
  "group flex w-full flex-col text-left transition-colors",
  "hover:bg-accent hover:text-accent-foreground",
  "focus-visible:bg-accent focus-visible:text-accent-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

/** Dialog list item overrides so focus rings and metadata are not clipped. */
export const searchDialogResultRowClassName = cn(
  "group flex w-full flex-col gap-0 overflow-visible",
);

/** Query-match marks stay legible on default, hovered, and selected accent rows. */
export const searchResultTitleMarkClassName = cn(
  "rounded-sm bg-transparent font-semibold underline decoration-current/70 underline-offset-2",
  "text-fd-primary",
  "group-hover:text-accent-foreground group-hover:decoration-accent-foreground/80",
  "group-focus-visible:text-accent-foreground group-focus-visible:decoration-accent-foreground/80",
  "group-aria-selected:text-fd-accent-foreground group-aria-selected:decoration-fd-accent-foreground/80",
);
