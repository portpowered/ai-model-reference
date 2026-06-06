import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "@/features/docs/components/list-decoration";

export type DocsIndexEntry = {
  slug: string;
  title: string;
  summary: string;
  url: string;
};

type DocsIndexEntryListProps = {
  entries: DocsIndexEntry[];
  listLabel: string;
};

export function DocsIndexEntryList({
  entries,
  listLabel,
}: DocsIndexEntryListProps) {
  return (
    <ul className={bulletlessListClassName("mt-8")} aria-label={listLabel}>
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link href={entry.url} className={docsResourceCardLinkClassName}>
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
