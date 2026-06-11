import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "@/features/docs/components/list-decoration";
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
          <ul className={bulletlessListClassName("mt-3")}>
            {group.tags.map((tag) => (
              <li key={tag.slug}>
                <Link href={tag.url} className={docsResourceCardLinkClassName}>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words font-medium text-foreground">
                      {tag.title}
                    </span>
                    <ArrowRight
                      className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <span className="max-w-full break-all rounded-md border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
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
