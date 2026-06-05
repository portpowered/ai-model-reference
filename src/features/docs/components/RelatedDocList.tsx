import Link from "next/link";
import { docsChromeLinkClassName } from "@/features/docs/components/docs-chrome-link";
import type { RelatedDocItem } from "@/lib/content/related-docs";

type RelatedDocListProps = {
  items: RelatedDocItem[];
  testId?: string;
  groupId?: string;
};

export function RelatedDocList({
  items,
  testId = "related-docs",
  groupId,
}: RelatedDocListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      className="space-y-3"
      data-testid={testId}
      {...(groupId ? { "data-related-group": groupId } : {})}
    >
      {items.map((item) => (
        <li
          key={item.registryId}
          className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          data-planned={item.isPlanned ? "true" : undefined}
        >
          {item.href ? (
            <Link
              href={item.href}
              className={`text-sm text-foreground ${docsChromeLinkClassName}`}
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-sm text-foreground">{item.title}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {item.reasonLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}
