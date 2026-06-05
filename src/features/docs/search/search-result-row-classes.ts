import { cn } from "@/lib/utils";

/** Shared interactive row styles for page hits on `/search`. */
export const searchPageResultRowClassName = cn(
  "group flex w-full flex-col text-left transition-colors",
  "hover:bg-accent hover:text-accent-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

/** Dialog list item overrides so focus rings and metadata are not clipped. */
export const searchDialogResultRowClassName = cn(
  "group flex w-full flex-col gap-0 overflow-visible",
);
