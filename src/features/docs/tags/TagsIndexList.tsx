import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { TagIndexCategoryGroup } from "@/lib/content/tags";

type TagsIndexListProps = {
  groups: TagIndexCategoryGroup[];
  listLabel: string;
};

export function TagsIndexList({ groups, listLabel }: TagsIndexListProps) {
  return (
    <section className="flex flex-col gap-8" aria-label={listLabel}>
      {groups.map((group) => (
        <section
          key={group.category}
          aria-labelledby={`tag-category-${group.category}`}
        >
          <h2
            id={`tag-category-${group.category}`}
            className="text-lg font-medium text-foreground"
          >
            {group.categoryLabel}
          </h2>
          <ul className="mt-3 flex list-none flex-col gap-3">
            {group.tags.map((tag) => (
              <li key={tag.slug}>
                <Link
                  href={tag.url}
                  className="group block rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-ring hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {tag.title}
                    </span>
                    <ArrowRight
                      className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                      {tag.slug}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tag.summary}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5">
                      {tag.categoryLabel}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
