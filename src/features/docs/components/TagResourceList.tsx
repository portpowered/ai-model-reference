import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "@/features/docs/components/list-decoration";
import type { TagResourceKindGroup } from "@/lib/content/tag-resources";

type TagResourceListProps = {
  groups: TagResourceKindGroup[];
  listLabel: string;
};

export function TagResourceList({ groups, listLabel }: TagResourceListProps) {
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
                      className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {resource.summary}
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
