import type { GlossaryEntry } from "@/lib/content/glossary";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type GlossaryIndexListProps = {
  entries: GlossaryEntry[];
  listLabel: string;
};

export function GlossaryIndexList({
  entries,
  listLabel,
}: GlossaryIndexListProps) {
  return (
    <ul className="mt-8 flex flex-col gap-3" aria-label={listLabel}>
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link
            href={entry.url}
            className="group block rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-ring hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-2 font-medium text-foreground">
              {entry.title}
              <ArrowRight
                className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </span>
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.summary}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
