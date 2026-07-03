import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "@/features/docs/components/list-decoration";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { formatCalendarMonthYear } from "@/lib/content/calendar-date";
import type { TagResourceKindGroup } from "@/lib/content/tag-resources";
import type { SiteLocale } from "@/lib/i18n/locale-routing";

type TagResourceListProps = {
  groups: TagResourceKindGroup[];
  listLabel: string;
  tagSlug?: string;
  locale?: SiteLocale;
};

function blogEntryTags(
  tags: string[] | undefined,
  tagSlug: string | undefined,
) {
  if (!tags || tags.length === 0) {
    return [];
  }

  if (!tagSlug) {
    return tags;
  }

  const filtered = tags.filter((slug) => slug !== tagSlug);
  return filtered.length > 0 ? filtered : tags;
}

export function TagResourceList({
  groups,
  listLabel,
  tagSlug,
  locale = "en",
}: TagResourceListProps) {
  return (
    <section className="flex flex-col gap-8" aria-label={listLabel}>
      {groups.map((group) => (
        <section
          key={group.kind}
          aria-labelledby={`tag-resources-${group.kind}`}
        >
          <h2
            id={`tag-resources-${group.kind}`}
            className="text-lg font-medium text-foreground"
          >
            {group.kindLabel}
          </h2>
          <ul className={bulletlessListClassName("mt-3")}>
            {group.resources.map((resource) => (
              <li key={resource.url}>
                <Link
                  href={resource.url}
                  className={docsResourceCardLinkClassName}
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    {resource.title}
                    <ArrowRight
                      className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden
                    />
                  </span>
                  {resource.kind === "blog" && resource.publishedAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <time dateTime={resource.publishedAt}>
                        {formatCalendarMonthYear(resource.publishedAt, locale)}
                      </time>
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {resource.summary}
                  </p>
                </Link>
                {resource.kind === "blog" ? (
                  <TagPillList tags={blogEntryTags(resource.tags, tagSlug)} />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
